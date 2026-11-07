/**
[header]
@author ertdfgcvb
@title  Plasma
@desc   Oldschool plasma demo
Plasma primer: https://www.bidouille.org/prog/plasma
*/

import { num, drawbox, rgba, cssColor, asBuffer } from "glyph-engine";
import type { Context, Cursor, Frame } from "glyph-engine";
const { map } = num;
const { drawInfo } = drawbox;
export const settings = { fps: 60 };

const { sin, cos, floor, sqrt, PI } = Math;
const density = "$?01▄abc+-><:. ";
// Code point per density step; one extra space for the top of the range
const glyphs = [...density, " "].map((c) => c.codePointAt(0)!);

const PI23 = (PI * 2) / 3;
const PI43 = (PI * 4) / 3;

// Fast API: fills the whole frame in one call (see README, "frame() programs").
export function frame(context: Context, cursor: Cursor, out: Frame) {
  const t1 = context.time * 0.0009;
  const t2 = context.time * 0.0003;
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;
  const cx = sin(-t1);
  const cy = cos(-t1);
  const dx = sin(t1);
  const dy = cos(t1);
  const white = cssColor("white");

  // lower value = harder gradient, better performance
  const quant = 2;
  const mult = 255 / (quant - 1);

  const { chars, fg, bg } = out;
  for (let y = 0, k = 0; y < context.rows; y++) {
    for (let x = 0; x < context.cols; x++, k++) {
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

      chars[k] = glyphs[idx]!;
      fg[k] = white;
      bg[k] = rgba(r, g, b);
    }
  }

  drawInfo(context, cursor, asBuffer(out));
}
