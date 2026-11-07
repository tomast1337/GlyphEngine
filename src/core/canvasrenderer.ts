/**
@module   canvasrenderer
@desc     renders to canvas
@category renderer
*/

import type { Buffer, Context } from "../modules/types";
import type { Render } from "./types";

export default {
  preferredElementNodeName: "CANVAS",
  render,
} as Render;

function render(context: Context, buffer: Buffer) {
  const canvas = context.settings.element as HTMLCanvasElement;

  const scale = devicePixelRatio;

  const c = context.cols;
  const r = context.rows;
  const m = context.metrics;

  const cw = m.cellWidth;
  const ch = Math.round(m.lineHeight);

  // Shortcut
  const settings = context.settings;

  // Assigning width/height, even the same value, reallocates the canvas and
  // resets the context, so only do it on a real change (size or devicePixelRatio).
  // Math.trunc matches how the browser stores a fractional size.
  const size = settings.canvasSize;
  const w = Math.trunc((size ? size.width : context.width) * scale);
  const h = Math.trunc((size ? size.height : context.height) * scale);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  // Fixed size, to allow precise export
  if (size) {
    canvas.style.width = size.width + "px";
    canvas.style.height = size.height + "px";
  }

  const ff = " " + m.fontSize + "px " + m.fontFamily;
  const bg =
    settings && settings.backgroundColor ? settings.backgroundColor : "white";
  const fg = settings && settings.color ? settings.color : "black";
  const fontWeight = settings && settings.fontWeight ? settings.fontWeight : "400";

  // Set the backgroundColor of the box-element
  // canvas.style.backgroundColor = settings.backgroundColor || 'white'

  // Transparent canvas backround for the remaining size
  // (fractions of cellWidth and lineHeight).
  // Only the 'rendered' area has a solid color.
  const ctx = canvas.getContext("2d");
  //ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = fg;
  ctx.textBaseline = "top";

  // Custom settings: it’s possible to center the canvas
  if (settings.canvasOffset) {
    const offs = settings.canvasOffset;
    const ox = Math.round(
      offs.x == "auto" ? (canvas.width / scale - c * cw) / 2 : offs.x
    );
    const oy = Math.round(
      offs.y == "auto" ? (canvas.height / scale - r * ch) / 2 : offs.y
    );
    ctx.translate(ox, oy);
  }

  // Center patch with cell bg color...
  // a bit painful and needs some opt.
  if (settings.textAlign == "center") {
    const widths: number[] = []; // reused for every row
    for (let j = 0; j < r; j++) {
      const offs = j * c;
      let totalWidth = 0;

      // Find width
      for (let i = 0; i < c; i++) {
        const cell = buffer[offs + i]!;
        ctx.font = (cell.fontWeight || fontWeight) + ff;
        const w = ctx.measureText(cell.char).width;
        totalWidth += w;
        widths[i] = w;
      }
      // Draw
      let ox = (canvas.width / scale - totalWidth) * 0.5;
      const y = j * ch;
      for (let i = 0; i < c; i++) {
        const cell = buffer[offs + i]!;
        const x = ox;
        if (cell.backgroundColor && cell.backgroundColor != bg) {
          ctx.fillStyle = cell.backgroundColor || bg;
          ctx.fillRect(Math.round(x), y, Math.ceil(widths[i]!), ch);
        }
        ctx.font = (cell.fontWeight || fontWeight) + ff;
        ctx.fillStyle = cell.color || fg;
        ctx.fillText(cell.char, ox, y);

        ox += widths[i]!;
      }
    }

    // (Default) block mode
  } else {
    let font = "";
    for (let j = 0; j < r; j++) {
      for (let i = 0; i < c; i++) {
        const cell = buffer[j * c + i]!;
        const x = i * cw;
        const y = j * ch;
        if (cell.backgroundColor && cell.backgroundColor != bg) {
          ctx.fillStyle = cell.backgroundColor || bg;
          ctx.fillRect(Math.round(x), y, Math.ceil(cw), ch);
        }
        if (cell.char === " ") continue;
        // Parsing a font string is slow; most neighbouring cells share one.
        const next = (cell.fontWeight || fontWeight) + ff;
        if (next !== font) ctx.font = font = next;
        ctx.fillStyle = cell.color || fg;
        ctx.fillText(cell.char, x, y);
      }
    }
  }
  ctx.restore();
}
