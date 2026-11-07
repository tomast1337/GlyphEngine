/**
[header]
@author Nicolas Vyčas Nery
@title  Rain
@desc   The frame keeps its content: fade what was drawn before
*/

import { rgba, asBuffer, drawbox } from "glyph-engine";
import type { Context, Cursor, Frame } from "glyph-engine";

export const settings = { backgroundColor: "black", fps: 30 };

// Unlike main(), the frame is not rebuilt each time: whatever frame() wrote
// stays until it is overwritten (the frame is only replaced on resize).
// Here each drop draws one glyph per frame and the old ones fade out.
const glyphs = [..."0123456789ABCDEF:.=*+-<>|"].map((c) => c.codePointAt(0)!);
const head = rgba(220, 255, 220);
let drops: number[] = []; // row of the drop in each column

export function frame(context: Context, cursor: Cursor, out: Frame) {
  const { cols, rows, chars, fg } = out;
  if (drops.length !== cols) drops = Array.from({ length: cols }, () => -Math.floor(Math.random() * rows));

  // Fade every cell: read the packed green channel, write it back darker.
  for (let k = 0; k < fg.length; k++) {
    const g = (fg[k]! >>> 16) & 255;
    if (g < 40) chars[k] = 32; // faded out: clear the glyph
    fg[k] = rgba(0, g * 0.88, 0);
  }

  // Click to start a drop in that column
  const cx = Math.floor(cursor.x);
  if (cursor.pressed && cx >= 0 && cx < cols) drops[cx] = Math.floor(cursor.y);

  for (let x = 0; x < cols; x++) {
    const y = drops[x]!++;
    if (y >= rows) drops[x] = -Math.floor(Math.random() * rows); // restart above the top
    if (y < 0 || y >= rows) continue;
    const k = x + y * cols;
    chars[k] = glyphs[Math.floor(Math.random() * glyphs.length)]!;
    fg[k] = head;
  }

  // FPS box: drawInfo() expects a buffer, asBuffer() lets it write into the frame
  drawbox.drawInfo(context, cursor, asBuffer(out));
}
