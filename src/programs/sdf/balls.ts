/**
[header]
@author ertdfgcvb
@title  Balls
@desc   Smooth SDF balls
*/

import type { CellOut, Context, Coord, Cursor } from "glyph-engine";
import  { num as num2, sdf } from "glyph-engine";

const density = "#ABC|/:÷×+-=?*· ";

const { PI, sin, cos, exp, abs } = Math;

// Per frame, the same for every cell: each ball's position and radius, the
// rotation (as sin/cos) and the smoothing. Computed once in pre(), not per cell.
const NUM = 12;
const balls: { x: number; y: number; r: number }[] = [];
let smooth = 0;
let rs = 0;
let rc = 0;
const f = { x: 0, y: 0 }; // the cell in a ball's space, reused

export function pre(context: Context) {
  const t = context.time * 0.001 + 10;
  smooth = num2.map(sin(t * 0.5), -1, 1, 0.0, 0.9);
  rs = sin(-t);
  rc = cos(-t);
  balls.length = 0;
  for (let i = 0; i < NUM; i++) {
    const r = num2.map(cos((t * 0.95 * (i + 1)) / (NUM + 1)), -1, 1, 0.1, 0.3);
    const x = num2.map(cos(t * 0.23 * ((i / NUM) * PI + PI)), -1, 1, -1.2, 1.2);
    const y = num2.map(sin(t * 0.37 * ((i / NUM) * PI + PI)), -1, 1, -1.2, 1.2);
    balls.push({ x, y, r });
  }
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  out: CellOut
) {
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;

  const stx = ((2.0 * (coord.x - context.cols / 2)) / m) * a;
  const sty = (2.0 * (coord.y - context.rows / 2)) / m;

  let d = Number.MAX_VALUE;
  for (const b of balls) {
    // Translate, then rotate
    const dx = stx - b.x;
    const dy = sty - b.y;
    f.x = dx * rc - dy * rs;
    f.y = dx * rs + dy * rc;
    d = sdf.opSmoothUnion(d, sdf.sdCircle(f, b.r), smooth);
  }

  let c = 1.0 - exp(-3 * abs(d));
  //if (d < 0) c = 0

  const index = Math.floor(c * density.length);

  out.char = density[index];
}
