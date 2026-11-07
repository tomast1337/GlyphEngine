/**
[header]
@author ertdfgcvb
@title  Plasma
@desc   Oldschool plasma demo
Plasma primer: https://www.bidouille.org/prog/plasma
*/

import { num, drawbox, rgba } from "glyph-engine";
import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";
const { map } = num;
const { drawInfo } = drawbox;
export const settings = { fps: 60 };

const { sin, cos, floor, sqrt, PI } = Math;
const density = "$?01▄abc+-><:. ";

const PI23 = (PI * 2) / 3;
const PI43 = (PI * 4) / 3;

// lower value = harder gradient, better performance
const quant = 2;
const mult = 255 / (quant - 1);

// Per frame, the same for every cell: computed once in pre().
let t1 = 0, t2 = 0, m = 0, a = 0;
let cx = 0, cy = 0, dx = 0, dy = 0;

export function pre(context: Context) {
  t1 = context.time * 0.0009;
  t2 = context.time * 0.0003;
  m = Math.min(context.cols, context.rows);
  a = context.metrics.aspect;
  cx = sin(-t1);
  cy = cos(-t1);
  dx = sin(t1);
  dy = cos(t1);
}

// Called for every cell: writes its glyph and colours into `out`.
export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
  const { x, y } = coord;
  const stx = ((2.0 * (x - context.cols / 2)) / m) * a;
  const sty = (2.0 * (y - context.rows / 2)) / m;
  const v1 = sin((x * dx + y * dy) * 0.08);
  const ex = stx - cx;
  const ey = sty - cy;
  const v2 = cos(sqrt(ex * ex + ey * ey) * 4.0);
  const v3 = v1 + v2;
  const idx = floor(map(v3, -2, 2, 0, 1) * density.length);

  const r = floor(map(sin(v3 * PI + t1), -1, 1, 0, quant)) * mult;
  const g = floor(map(sin(v3 * PI23 + t2), -1, 1, 0, quant)) * mult;
  const b = floor(map(sin(v3 * PI43 - t1), -1, 1, 0, quant)) * mult;

  out.char = density[idx]; // past the end (v3 == 2): undefined, an empty cell
  out.color = "white";
  out.background = rgba(r, g, b);
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer);
}
