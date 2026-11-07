/**
[header]
@author ertdfgcvb
@title  Balls (frame)
@desc   sdf/balls written with frame()
*/

import { num, sdf, asBuffer, drawbox } from "glyph-engine";
import type { Context, Cursor, Frame } from "glyph-engine";

const { PI, sin, cos, exp, abs, floor, min } = Math;
const { map } = num;

// Same picture as sdf/balls. With frame() the values shared by every cell
// (ball positions, rotation) are simply computed before the cell loop.
const density = "#ABC|/:÷×+-=?*· ";
// Code point per density step; one extra space for the top of the range
const glyphs = [...density, " "].map((c) => c.codePointAt(0)!);

const NUM = 12;
const balls = Array.from({ length: NUM }, () => ({ x: 0, y: 0, r: 0 }));
const f = { x: 0, y: 0 }; // the cell in a ball's space, reused

export function frame(context: Context, cursor: Cursor, out: Frame) {
  const { cols, rows, chars } = out;
  const t = context.time * 0.001 + 10;
  const m = min(cols, rows);
  const a = context.metrics.aspect;

  // Per frame
  const smooth = map(sin(t * 0.5), -1, 1, 0.0, 0.9);
  const rs = sin(-t);
  const rc = cos(-t);
  for (let i = 0; i < NUM; i++) {
    const b = balls[i]!;
    b.r = map(cos((t * 0.95 * (i + 1)) / (NUM + 1)), -1, 1, 0.1, 0.3);
    b.x = map(cos(t * 0.23 * ((i / NUM) * PI + PI)), -1, 1, -1.2, 1.2);
    b.y = map(sin(t * 0.37 * ((i / NUM) * PI + PI)), -1, 1, -1.2, 1.2);
  }

  // Per cell
  for (let y = 0, k = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++, k++) {
      const stx = ((2.0 * (x - cols / 2)) / m) * a;
      const sty = (2.0 * (y - rows / 2)) / m;
      let d = Number.MAX_VALUE;
      for (const b of balls) {
        // Translate, then rotate
        const dx = stx - b.x;
        const dy = sty - b.y;
        f.x = dx * rc - dy * rs;
        f.y = dx * rs + dy * rc;
        d = sdf.opSmoothUnion(d, sdf.sdCircle(f, b.r), smooth);
      }
      const c = 1.0 - exp(-3 * abs(d));
      chars[k] = glyphs[floor(c * density.length)]!;
    }
  }

  // FPS box: drawInfo() expects a buffer, asBuffer() lets it write into the frame
  drawbox.drawInfo(context, cursor, asBuffer(out));
}
