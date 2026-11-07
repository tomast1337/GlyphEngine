#version 300 es
// Draws the whole character grid: one fragment = one screen pixel.
// Finds its cell, reads the cell texel, samples the glyph atlas, mixes fg/bg.
// Layering: this cell's background, the left neighbour's glyph overflow (right
// half of a wide glyph), then this cell's glyph.
precision highp float;
precision highp int;
precision highp usampler2D;

uniform usampler2D u_cells;  // per cell: x = atlas slot, y = fg RGBA8, z = bg RGBA8, w = flags
uniform sampler2D u_atlas;   // glyphs drawn white by Canvas2D, premultiplied alpha
uniform vec2 u_cellSize;     // cell size in device pixels (x may be fractional)
uniform vec2 u_offset;       // grid origin in device pixels, from the top-left
uniform float u_height;      // canvas height in device pixels (gl_FragCoord is bottom-up)
uniform ivec2 u_grid;        // cols, rows
uniform ivec2 u_slotSize;    // atlas slot size in pixels: two cells wide, for wide glyphs
uniform int u_slotsPerRow;
uniform vec4 u_background;   // canvas background, also outside the grid
uniform uint u_backgroundPacked; // same colour as RGBA8: cells with it draw no background

out vec4 outColor;

const uint FLAG_COLOR_GLYPH = 1u; // emoji etc.: keep the glyph's own colours

vec4 unpack(uint c) {
  return vec4(uvec4(c >> 24, (c >> 16) & 255u, (c >> 8) & 255u, c & 255u)) / 255.0;
}

// Draws the glyph of cell `c` over `color`; `local` is the pixel relative to
// that cell's top-left corner.
vec3 drawGlyph(vec3 color, uvec4 c, vec2 local) {
  if (c.x == 0u) return color; // slot 0: space
  int slot = int(c.x);
  ivec2 origin = ivec2(slot % u_slotsPerRow, slot / u_slotsPerRow) * u_slotSize;
  ivec2 p = ivec2(local);
  if (p.x >= u_slotSize.x || p.y >= u_slotSize.y) return color;
  vec4 glyph = texelFetch(u_atlas, origin + p, 0);
  vec4 fg = unpack(c.y);
  bool colorGlyph = (c.w & FLAG_COLOR_GLYPH) != 0u;
  float coverage = colorGlyph ? glyph.a : glyph.a * fg.a;
  vec3 ink = colorGlyph ? glyph.rgb : fg.rgb * coverage;
  return color * (1.0 - coverage) + ink;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, u_height - gl_FragCoord.y) - u_offset;
  ivec2 cell = ivec2(floor(px / u_cellSize));
  if (px.x < 0.0 || px.y < 0.0 || cell.x >= u_grid.x || cell.y >= u_grid.y) {
    outColor = u_background;
    return;
  }

  vec3 color = u_background.rgb;
  vec2 local = px - vec2(cell) * u_cellSize;

  uvec4 c = texelFetch(u_cells, cell, 0);
  if (c.z != u_backgroundPacked) {
    vec4 bg = unpack(c.z); // translucent backgrounds blend, as with Canvas2D
    color = mix(color, bg.rgb, bg.a);
  }
  if (cell.x > 0) {
    uvec4 left = texelFetch(u_cells, cell - ivec2(1, 0), 0);
    color = drawGlyph(color, left, local + vec2(u_cellSize.x, 0.0));
  }
  outColor = vec4(drawGlyph(color, c, local), 1.0);
}
