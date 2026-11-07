/**
[header]
@author ertdfgcvb
@title  Rectangles
@desc   Smooth SDF Rectangles
*/
import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";
import { drawbox,num,sdf } from "glyph-engine";

let density = "▚▀abc|/:÷×+-=?*· ";

const g = 1.2;
const size = { x: g * 0.33, y: 0.01 };
// Per frame, the same for every cell: each box's position and rotation
// (as sin/cos), and the smoothing. Computed once in pre(), not per cell.
const boxes: { x: number; y: number; s: number; c: number }[] = [];
let smooth = 0;
const p = { x: 0, y: 0 }; // the cell in a box's space, reused

export function pre(context: Context) {
  const t = context.time;
  smooth = num.map(Math.sin(t * 0.0005), -1, 1, 0.0, 0.4);
  boxes.length = 0;
  for (let by = -g; by <= g; by += g * 0.33) {
    for (let bx = -g; bx <= g; bx += g * 0.33) {
      const r = t * 0.0004 * (bx + g * 2) + (by + g * 2);
      boxes.push({ x: bx, y: by, s: Math.sin(-r), c: Math.cos(-r) });
    }
  }
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  out: CellOut
) {
  const m = Math.max(context.cols, context.rows);
  const a = context.metrics.aspect;

  const stx = (2.0 * (coord.x - context.cols / 2)) / m;
  const sty = (2.0 * (coord.y - context.rows / 2)) / m / a;

  let d = 1e100;
  for (const b of boxes) {
    // Translate, then rotate
    const dx = stx - b.x;
    const dy = sty - b.y;
    p.x = dx * b.c - dy * b.s;
    p.y = dx * b.s + dy * b.c;
    d = sdf.opSmoothUnion(d, sdf.sdBox(p, size), smooth);
  }

  let c = 1.0 - Math.exp(-5 * Math.abs(d));
  const index = Math.floor(c * density.length);

  out.char = density[index];
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawbox.drawInfo(context, cursor, buffer);
}
