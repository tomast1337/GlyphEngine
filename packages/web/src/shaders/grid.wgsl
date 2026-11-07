// Draws the whole character grid, as grid.frag does for WebGL2: one fragment =
// one screen pixel. Finds its cell, reads it, samples the glyph atlas, mixes
// fg/bg. Layering: this cell's background, the left neighbour's glyph overflow
// (right half of a wide glyph), then this cell's glyph.

struct Draw {
  cellSize: vec2f,         // cell size in device pixels (x may be fractional)
  offset: vec2f,           // grid origin in device pixels, from the top-left
  grid: vec2u,             // cols, rows
  slotSize: vec2u,         // atlas slot size in pixels: two cells wide, for wide glyphs
  background: vec4f,       // canvas background, also outside the grid
  slotsPerRow: u32,
  backgroundPacked: u32,   // same colour as RGBA8: cells with it draw no background
  useOverlay: u32,         // 1: cells flagged in `overlay` win over `cells`
}

@group(0) @binding(0) var<uniform> d: Draw;
@group(0) @binding(1) var<storage, read> cells: array<vec4u>;   // per cell: atlas slot, fg RGBA8, bg RGBA8, flags
@group(0) @binding(2) var<storage, read> overlay: array<vec4u>; // same layout: what pre()/post() drew over a GPU program
@group(0) @binding(3) var atlas: texture_2d<f32>;               // glyphs drawn white by Canvas2D, premultiplied alpha

const FLAG_COLOR_GLYPH = 1u; // emoji etc.: keep the glyph's own colours
const FLAG_OVERLAY = 2u;     // overlay cell present

// Fullscreen triangle built from the vertex index: no vertex buffers needed.
@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

fn unpack(c: u32) -> vec4f {
  return vec4f(f32(c >> 24u), f32((c >> 16u) & 255u), f32((c >> 8u) & 255u), f32(c & 255u)) / 255.0;
}

fn cellAt(k: u32) -> vec4u {
  if (d.useOverlay != 0u) {
    let o = overlay[k];
    if ((o.w & FLAG_OVERLAY) != 0u) { return o; }
  }
  return cells[k];
}

// Draws the glyph of cell `c` over `color`; `local` is the pixel relative to
// that cell's top-left corner.
fn drawGlyph(color: vec3f, c: vec4u, local: vec2f) -> vec3f {
  if (c.x == 0u) { return color; } // slot 0: space
  let origin = vec2u(c.x % d.slotsPerRow, c.x / d.slotsPerRow) * d.slotSize;
  let p = vec2u(local);
  if (p.x >= d.slotSize.x || p.y >= d.slotSize.y) { return color; }
  let glyph = textureLoad(atlas, origin + p, 0);
  let fg = unpack(c.y);
  let colorGlyph = (c.w & FLAG_COLOR_GLYPH) != 0u;
  let coverage = select(glyph.a * fg.a, glyph.a, colorGlyph);
  let ink = select(fg.rgb * coverage, glyph.rgb, colorGlyph);
  return color * (1.0 - coverage) + ink;
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let px = pos.xy - d.offset;
  let cell = vec2i(floor(px / d.cellSize));
  if (px.x < 0.0 || px.y < 0.0 || cell.x >= i32(d.grid.x) || cell.y >= i32(d.grid.y)) {
    return d.background;
  }

  var color = d.background.rgb;
  let local = px - vec2f(cell) * d.cellSize;
  let k = u32(cell.y) * d.grid.x + u32(cell.x);

  let c = cellAt(k);
  if (c.z != d.backgroundPacked) {
    let bg = unpack(c.z); // translucent backgrounds blend, as with Canvas2D
    color = mix(color, bg.rgb, bg.a);
  }
  if (cell.x > 0) {
    color = drawGlyph(color, cellAt(k - 1u), local + vec2f(d.cellSize.x, 0.0));
  }
  return vec4f(drawGlyph(color, c, local), 1.0);
}
