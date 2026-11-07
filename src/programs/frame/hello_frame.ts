/**
[header]
@author Nicolas Vyčas Nery
@title  Hello frame
@desc   The frame() API: fill the whole grid in one call
*/

import { rgba, setChar } from "glyph-engine";
import type { Context, Cursor, Frame } from "glyph-engine";

export const settings = { backgroundColor: "black", color: "white" };

// frame() runs once per frame (main() runs once per cell).
// `out` has one entry per cell in typed arrays, cell index k = x + y * cols:
//   out.chars   the glyph as a Unicode code point ("#" is 0x23 or "#".codePointAt(0))
//   out.fg      text colour, packed by rgba(r, g, b)    0 = settings.color
//   out.bg      background colour                        0 = settings.backgroundColor
//   out.weight  font weight / 100 (7 = bold)             0 = settings.fontWeight
const pattern = [..."·-+*#"].map((c) => c.codePointAt(0)!);

export function frame(context: Context, cursor: Cursor, out: Frame) {
  const { cols, rows, chars, fg, bg } = out;
  const t = context.time * 0.002;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const k = x + y * cols;
      const v = (Math.sin(x * 0.2 + t) + Math.cos(y * 0.3 - t) + 2) / 4; // 0..1
      chars[k] = pattern[Math.min(pattern.length - 1, Math.floor(v * pattern.length))]!;
      fg[k] = rgba((x / cols) * 255, (y / rows) * 255, 160);
      bg[k] = 0; // default background
    }
  }

  // Text: setChar() writes one glyph from a string, emoji included.
  const text = [..." Hello frame() 👋 "];
  text.forEach((c, i) => {
    const k = 2 + i + 2 * cols;
    setChar(out, k, c);
    fg[k] = rgba(0, 0, 0);
    bg[k] = rgba(255, 255, 255);
  });
}
