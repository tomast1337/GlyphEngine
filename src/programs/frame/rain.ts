/**
[header]
@author Nicolas Vyčas Nery
@title  Rain
@desc   The frame keeps its content: fade what was drawn before
*/

import { rgba, asBuffer, drawbox } from "glyph-engine";
import type { Context, Cursor, Frame } from "glyph-engine";

export const settings = { backgroundColor: "black", fps: 60 };

// Unlike main(), the frame is not rebuilt each time: whatever frame() wrote
// stays until it is overwritten (the frame is only replaced on resize).
// Here each drop draws its glyphs and the old ones fade out.
//
// Speed and fade are per second, scaled by context.delta (ms since the last
// frame), so the rain looks the same at any frame rate: try fps: 10.
const SPEED = 30; // rows per second
const FADE = 0.02; // brightness left after one second
const glyphs = [..."0123456789ABCDEF:.=*+-<>|"].map((c) => c.codePointAt(0)!);
const head = rgba(220, 255, 220);
let drops: number[] = []; // row of the drop in each column (fractional)

export function frame(context: Context, cursor: Cursor, out: Frame) {
  const { cols, rows, chars, fg } = out;
  if (drops.length !== cols) drops = Array.from({ length: cols }, () => -Math.random() * rows);

  // Fade every cell: read the packed green channel, write it back darker.
  const fade = Math.pow(FADE, context.delta / 1000);
  for (let k = 0; k < fg.length; k++) {
    const g = (fg[k]! >>> 16) & 255;
    if (g < 40) chars[k] = 32; // faded out: clear the glyph
    fg[k] = rgba(0, g * fade, 0);
  }

  // Click to start a drop in that column
  const cx = Math.floor(cursor.x);
  if (cursor.pressed && cx >= 0 && cx < cols) drops[cx] = Math.floor(cursor.y);

  const step = (SPEED * context.delta) / 1000;
  for (let x = 0; x < cols; x++) {
    const from = Math.floor(drops[x]!);
    drops[x]! += step;
    const to = Math.floor(drops[x]!);
    // Every row passed since the last frame (several when the frame rate is low)
    for (let y = Math.max(0, from + 1); y <= to && y < rows; y++) {
      const k = x + y * cols;
      chars[k] = glyphs[Math.floor(Math.random() * glyphs.length)]!;
      fg[k] = head;
    }
    if (to >= rows) drops[x] = -Math.random() * rows; // restart above the top
  }

  // FPS box: drawInfo() expects a buffer, asBuffer() lets it write into the frame
  drawbox.drawInfo(context, cursor, asBuffer(out));
}
