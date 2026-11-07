/**
@module   webglrenderer
@desc     renders to canvas with WebGL2: the whole grid in one draw call
@category renderer
*/

import type { Buffer, Context } from "../modules/types";
import type { Render } from "./types";
import canvasRenderer from "./canvasrenderer";
import { fitCanvas } from "./canvassize";
import { cellSpan } from "./cellspan";
import vertSource from "./shaders/grid.vert" with { type: "text" };
import fragSource from "./shaders/grid.frag" with { type: "text" };

export default {
  preferredElementNodeName: "CANVAS",
  render,
} as Render;

// GL state rules for this file:
// - every GL call lives in this module; nothing GL-related is module-level
//   except this map from canvas to its own state object;
// - a state object owns its context and resources (program, VAO, textures);
// - draw() sets every binding and pixel-store flag it relies on, every frame,
//   and never assumes what a previous call left bound.
type GLState = ReturnType<typeof createState>;
const FALLBACK = "canvas";
const states = new WeakMap<HTMLCanvasElement, GLState | typeof FALLBACK>();

const ATLAS_UNIT = 1; // texture unit of the glyph atlas; the cell texture uses unit 0
const FLAG_COLOR_GLYPH = 1; // keep in sync with grid.frag

function render(context: Context, buffer: Buffer) {
  const canvas = context.settings.element as HTMLCanvasElement;
  let state = states.get(canvas);
  if (!state) {
    // Centered text needs per-glyph measuring: leave it to the canvas renderer,
    // which also covers browsers without WebGL2.
    const gl =
      context.settings.textAlign == "center"
        ? null
        : canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (gl?.isContextLost()) return; // wait for webglcontextrestored
    state = gl ? createState(gl) : FALLBACK;
    if (gl) {
      // Lost: skip frames (preventDefault allows a restore). Restored: every
      // resource is gone, so drop the state and rebuild it on the next frame.
      canvas.addEventListener("webglcontextlost", (e) => e.preventDefault(), { once: true });
      canvas.addEventListener("webglcontextrestored", () => states.delete(canvas), { once: true });
    }
    states.set(canvas, state);
  }
  if (state === FALLBACK) return canvasRenderer.render(context, buffer);
  if (state.gl.isContextLost()) return;
  draw(state, context, buffer);
}

function createState(gl: WebGL2RenderingContext) {
  const program = linkProgram(gl, vertSource, fragSource);
  const u = (name: string) => gl.getUniformLocation(program, name);
  const scratch = document.createElement("canvas");
  return {
    gl,
    program,
    uniforms: {
      cells: u("u_cells"),
      atlas: u("u_atlas"),
      cellSize: u("u_cellSize"),
      offset: u("u_offset"),
      height: u("u_height"),
      grid: u("u_grid"),
      slotSize: u("u_slotSize"),
      slotsPerRow: u("u_slotsPerRow"),
      background: u("u_background"),
      backgroundPacked: u("u_backgroundPacked"),
    },
    vao: gl.createVertexArray()!, // empty: the vertex shader uses gl_VertexID
    cellTexture: gl.createTexture()!,
    cells: new Uint32Array(0),
    cols: 0,
    rows: 0,
    atlas: {
      texture: gl.createTexture()!,
      size: Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE)),
      key: "", // font size + family + slot size the atlas was built for
      slotW: 0,
      slotH: 0,
      perRow: 0,
      capacity: 0,
      next: 1, // slot 0 stays empty: spaces and blank cells
      glyphs: new Map<string | number, Map<unknown, number>>(), // weight -> char -> slot
      colored: new Uint8Array(0),
      wide: new Uint8Array(0), // per slot: glyph covers two cells
    },
    colors: new Map<string, number>(),
    // Rasterizes one glyph at a time and normalizes CSS colours.
    scratch,
    scratchCtx: scratch.getContext("2d", { willReadFrequently: true })!,
  };
}

function draw(s: GLState, context: Context, buffer: Buffer) {
  const { gl, uniforms } = s;
  const canvas = gl.canvas as HTMLCanvasElement;
  const settings = context.settings;
  const m = context.metrics;
  const scale = devicePixelRatio;
  fitCanvas(canvas, context, scale);

  const cols = context.cols;
  const rows = context.rows;
  const cw = m.cellWidth;
  const ch = Math.round(m.lineHeight);
  const fontSize = m.fontSize * scale;
  // Slots are two cells wide so wide glyphs (emoji, CJK) can overflow into the next cell.
  ensureAtlas(s, 2 * Math.ceil(cw * scale), Math.ceil(ch * scale), fontSize + "px " + m.fontFamily);
  ensureCells(s, cols, rows);

  // Same defaults as the canvas renderer
  const bg = packColor(s, settings.backgroundColor || "white");
  const fg = packColor(s, settings.color || "black");
  const fontWeight = settings.fontWeight || "400";

  const data = s.cells;
  const { colored, wide } = s.atlas;
  // Neighbouring cells usually share colours: skip the Map lookup on repeats.
  let lastFg: string | undefined = "", lastFgV = fg;
  let lastBg: string | undefined = "", lastBgV = bg;
  for (let j = 0; j < rows; j++) {
    // Wide glyphs take two columns and push the rest of the row right (the last
    // cells fall off), like the text renderer; the shader just sees a grid.
    const row = j * cols;
    let col = 0;
    for (let i = 0; i < cols && col < cols; i++) {
      const cell = buffer[row + i]!;
      const slot = glyphSlot(s, cell.char, cell.fontWeight || fontWeight, fontSize, m.fontFamily);
      if (cell.color !== lastFg) lastFgV = (lastFg = cell.color) ? packColor(s, lastFg) : fg;
      if (cell.backgroundColor !== lastBg) lastBgV = (lastBg = cell.backgroundColor) ? packColor(s, lastBg) : bg;
      let o = (row + col++) * 4;
      data[o] = slot;
      data[o + 1] = lastFgV;
      data[o + 2] = lastBgV;
      data[o + 3] = colored[slot] ? FLAG_COLOR_GLYPH : 0;
      if (wide[slot] && col < cols) {
        // Continuation cell: no glyph, same background; the shader draws the
        // glyph's right half as overflow from its left neighbour.
        o = (row + col++) * 4;
        data[o] = 0;
        data[o + 1] = lastFgV;
        data[o + 2] = lastBgV;
        data[o + 3] = 0;
      }
    }
  }

  // Grid origin, as the canvas renderer computes it (CSS px, rounded)
  let ox = 0;
  let oy = 0;
  if (settings.canvasOffset) {
    const offs = settings.canvasOffset;
    ox = Math.round(offs.x == "auto" ? (canvas.width / scale - cols * cw) / 2 : offs.x);
    oy = Math.round(offs.y == "auto" ? (canvas.height / scale - rows * ch) / 2 : offs.y);
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(s.program);
  gl.bindVertexArray(s.vao);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, s.cellTexture);
  setUnpack(gl, false);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, cols, rows, gl.RGBA_INTEGER, gl.UNSIGNED_INT, data);

  gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, s.atlas.texture);

  const a = s.atlas;
  gl.uniform1i(uniforms.cells, 0);
  gl.uniform1i(uniforms.atlas, ATLAS_UNIT);
  gl.uniform2f(uniforms.cellSize, cw * scale, ch * scale);
  gl.uniform2f(uniforms.offset, ox * scale, oy * scale);
  gl.uniform1f(uniforms.height, canvas.height);
  gl.uniform2i(uniforms.grid, cols, rows);
  gl.uniform2i(uniforms.slotSize, a.slotW, a.slotH);
  gl.uniform1i(uniforms.slotsPerRow, a.perRow);
  gl.uniform4f(uniforms.background, (bg >>> 24) / 255, ((bg >>> 16) & 255) / 255, ((bg >>> 8) & 255) / 255, 1);
  gl.uniform1ui(uniforms.backgroundPacked, bg);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}

// (Re)allocates the cell texture when the grid size changes.
function ensureCells(s: GLState, cols: number, rows: number) {
  if (s.cols === cols && s.rows === rows) return;
  const { gl } = s;
  s.cols = cols;
  s.rows = rows;
  s.cells = new Uint32Array(cols * rows * 4);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, s.cellTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, cols, rows, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, null);
  setNearest(gl);
}

// (Re)builds an empty atlas when the font or the cell size in pixels changes
// (e.g. a devicePixelRatio change).
function ensureAtlas(s: GLState, slotW: number, slotH: number, font: string) {
  const a = s.atlas;
  const key = font + "|" + slotW + "x" + slotH;
  if (a.key === key) return;
  const { gl } = s;
  a.key = key;
  a.slotW = slotW;
  a.slotH = slotH;
  a.perRow = Math.floor(a.size / slotW);
  a.capacity = a.perRow * Math.floor(a.size / slotH);
  a.colored = new Uint8Array(a.capacity);
  a.wide = new Uint8Array(a.capacity);
  a.glyphs.clear();
  a.next = 1;
  s.scratch.width = slotW;
  s.scratch.height = slotH;
  gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, a.texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, a.size, a.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  setNearest(gl);
}

// Atlas slot for a (char, weight) pair; draws and uploads it on first use.
function glyphSlot(s: GLState, char: unknown, weight: string | number, fontSize: number, family: string) {
  if (char === " " || char === "" || char == null) return 0;
  const a = s.atlas;
  let slot = a.glyphs.get(weight)?.get(char);
  if (slot !== undefined) return slot;

  // shortcut: when full, start over; cells already written this frame could point
  // at reused slots. Capacity is thousands of glyphs, so add eviction if that bites.
  if (a.next >= a.capacity) {
    a.glyphs.clear();
    a.colored.fill(0);
    a.wide.fill(0);
    a.next = 1;
  }
  slot = a.next++;

  const ctx = s.scratchCtx;
  ctx.clearRect(0, 0, a.slotW, a.slotH);
  ctx.font = weight + " " + fontSize + "px " + family;
  ctx.textBaseline = "top";
  ctx.fillStyle = "white";
  ctx.fillText(String(char), 0, 0);
  a.colored[slot] = isColorGlyph(ctx.getImageData(0, 0, a.slotW, a.slotH).data) ? 1 : 0;
  a.wide[slot] = cellSpan(ctx, ctx.font, String(char), a.slotW / 2) - 1; // slots are two cells wide

  const { gl } = s;
  gl.activeTexture(gl.TEXTURE0 + ATLAS_UNIT);
  gl.bindTexture(gl.TEXTURE_2D, a.texture);
  setUnpack(gl, true);
  const x = (slot % a.perRow) * a.slotW;
  const y = Math.floor(slot / a.perRow) * a.slotH;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, s.scratch);

  let byChar = a.glyphs.get(weight);
  if (!byChar) a.glyphs.set(weight, (byChar = new Map()));
  byChar.set(char, slot);
  return slot;
}

// Text drawn in white stays grey; emoji bring their own colours.
function isColorGlyph(px: Uint8ClampedArray) {
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! > 0 && (px[i] !== px[i + 1] || px[i + 1] !== px[i + 2])) return true;
  }
  return false;
}

// CSS colour string to 0xRRGGBBAA. The browser normalizes any CSS colour to
// "#rrggbb" or "rgba(r, g, b, a)"; results are cached per string.
function packColor(s: GLState, css: string): number {
  let v = s.colors.get(css);
  if (v !== undefined) return v;
  const ctx = s.scratchCtx;
  ctx.fillStyle = "#000"; // an invalid string leaves this value
  ctx.fillStyle = css;
  const n = ctx.fillStyle as string;
  if (n[0] === "#") {
    v = ((parseInt(n.slice(1), 16) << 8) | 255) >>> 0;
  } else {
    const [r = 0, g = 0, b = 0, alpha = 1] = n.slice(n.indexOf("(") + 1, -1).split(",").map(Number);
    v = ((r << 24) | (g << 16) | (b << 8) | Math.round(alpha * 255)) >>> 0;
  }
  // shortcut: animated programs can make new colour strings every frame; drop the
  // whole cache past this size rather than tracking use.
  if (s.colors.size > 65536) s.colors.clear();
  s.colors.set(css, v);
  return v;
}

function setUnpack(gl: WebGL2RenderingContext, premultiply: boolean) {
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
}

// Integer textures require NEAREST; texelFetch ignores filtering anyway.
function setNearest(gl: WebGL2RenderingContext) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function linkProgram(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error("Shader compile failed: " + gl.getShaderInfoLog(shader));
    }
    return shader;
  };
  const program = gl.createProgram()!;
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Shader link failed: " + gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vs); // the linked program keeps what it needs
  gl.deleteShader(fs);
  return program;
}
