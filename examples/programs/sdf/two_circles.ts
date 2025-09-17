/**
[header]
@author ertdfgcvb
@title  Two circles
@desc   Smooth union of two circles
*/

import type { Buffer, Context, Coord, Cursor } from "glyph-engine";
import  { vec2,sdf,drawbox } from "glyph-engine";

const density = "#WX?*:÷×+=-· ";

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time;
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;

  const st = vec2.vec2(
    ((2.0 * (coord.x - context.cols / 2)) / m) * a,
    (2.0 * (coord.y - context.rows / 2)) / m
  );

  // A bit of a waste as cursor is not coord dependent;
  // it could be calculated in pre(), and stored in a global
  // (see commented code below).
  const pointer = vec2.vec2(
    ((2.0 * (cursor.x - context.cols / 2)) / m) * a,
    (2.0 * (cursor.y - context.rows / 2)) / m
  );

  // Circles
  const d1 = sdf.sdCircle(st, 0.2); // origin, 0.2 is the radius
  const d2 = sdf.sdCircle(vec2.sub(st, pointer), 0.2); // cursor

  // Smooth operation
  const d = sdf.opSmoothUnion(d1, d2, 0.7);

  // Calc index of the char map
  const c = 1.0 - Math.exp(-5 * Math.abs(d));
  const index = Math.floor(c * density.length);

  return density[index];
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawbox.drawInfo(context, cursor, buffer);
}

// Uncomment this to calculate the cursor position only once
// and pass it to the main function as a global
/*
const p = vec2.vec2(0, 0)
export function pre(context, cursor, buffer) {
   	const m = Math.min(context.cols, context.rows)
    const a = context.metrics.aspect
	p.x = 2.0 * (cursor.x - context.cols / 2) / m * a,
	p.y = 2.0 * (cursor.y - context.rows / 2) / m
}
*/
