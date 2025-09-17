/**
[header]
@author ertdfgcvb
@title  How to draw a square
@desc   Draw a square using a distance function
*/

import { drawbox, num } from "glyph-engine";
import type { Buffer, Context, Coord, Cursor, vec2 } from "glyph-engine";

// Set framerate to 60
export const settings = { fps: 60 };

// Function to measure a distance to a square
export function box(p: vec2.Vec2, size: vec2.Vec2) {
  const dx = Math.max(Math.abs(p.x) - size.x, 0);
  const dy = Math.max(Math.abs(p.y) - size.y, 0);
  // return the distance from the point
  return Math.sqrt(dx * dx + dy * dy);
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time;
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;

  // Normalize space and adjust aspect ratio (screen and char)
  const st = {
    x: (2.0 * (coord.x - context.cols / 2)) / m,
    y: (2.0 * (coord.y - context.rows / 2)) / m / a,
  };

  // Transform the coordinate by rotating it
  const ang = t * 0.0015;
  const s = Math.sin(-ang);
  const c = Math.cos(-ang);
  const p = {
    x: st.x * c - st.y * s,
    y: st.x * s + st.y * c,
  };

  // Size of the square
  const size = num.map(Math.sin(t * 0.0023), -1, 1, 0.1, 2);

  // Calculate the distance
  const d = box(p, { x: size, y: size });

  // Visualize the distance field
  return d == 0 ? " " : ("" + d).charAt(2);
  // Visualize the distance field and some background
  // return d == 0 ? (coord.x % 2 == 0 ? '─' : '┼') : (''+d).charAt(2)
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
    drawbox.drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
