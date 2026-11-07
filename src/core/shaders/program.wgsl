// Runs a program's WGSL main() for every cell, like the JS loop in computeFrame.
// The program's source replaces the PROGRAM line; everything above it is what
// a program can use.

struct Context {
  time: f32,      // ms
  delta: f32,     // ms since the previous frame
  frame: u32,
  cols: u32,
  rows: u32,
  aspect: f32,    // cell width / height
  cursor: vec2f,  // in cells (fractional)
  pressed: u32,   // 1 while the pointer is down
}

// What main() writes. Colours are 0-1 per channel, alpha included.
struct Cell {
  char: u32,          // a code point; glyph(i) gives the i-th of the program's glyphs
  color: vec4f,       // starts as settings.color
  background: vec4f,  // starts as settings.backgroundColor
}

struct GeEngine {
  ctx: Context,
  color: vec4f,
  background: vec4f,
}

@group(0) @binding(0) var<uniform> ge_engine: GeEngine;
@group(0) @binding(1) var<storage, read> ge_glyphs: array<u32>; // the program's glyphs, as code points
@group(0) @binding(2) var<storage, read> ge_slots: array<u32>;  // code point (< 0x10000) -> atlas slot | flags << 16
@group(0) @binding(3) var<storage, read_write> ge_cells: array<vec4u>;

// The i-th glyph of the program's `glyphs` string (clamped to the last one).
fn glyph(i: u32) -> u32 {
  return ge_glyphs[min(i, GLYPHS - 1u)];
}

// PROGRAM

fn ge_pack(c: vec4f) -> u32 {
  let v = vec4u(round(clamp(c, vec4f(0.0), vec4f(1.0)) * 255.0));
  return (v.r << 24u) | (v.g << 16u) | (v.b << 8u) | v.a;
}

@compute @workgroup_size(8, 8)
fn ge_main(@builtin(global_invocation_id) id: vec3u) {
  let ctx = ge_engine.ctx;
  if (id.x >= ctx.cols || id.y >= ctx.rows) { return; }
  var out = Cell(32u, ge_engine.color, ge_engine.background);
  main(vec2f(id.xy), ctx, &out);
  var entry = 0u; // glyphs not in the program's set draw nothing
  if (out.char < 65536u) { entry = ge_slots[out.char]; }
  ge_cells[id.y * ctx.cols + id.x] = vec4u(entry & 0xffffu, ge_pack(out.color), ge_pack(out.background), entry >> 16u);
}
