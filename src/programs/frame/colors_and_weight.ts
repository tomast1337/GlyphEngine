/**
[header]
@author Nicolas Vyčas Nery
@title  Colors and weight
@desc   Packing colours once, font weight, and 0 as "use the default"
*/

import { cssColor, rgba, asBuffer, drawbox } from "glyph-engine";
import type { Context, Cursor, Frame } from "glyph-engine";

export const settings = { backgroundColor: "black", color: "gray", fontWeight: "400" };

// Colours are numbers. Pack them once, outside frame(), and reuse them:
// cssColor() takes any CSS colour, rgba() takes channels 0-255.
const palette = ["crimson", "orange", "gold", "seagreen", "royalblue", "purple"].map(cssColor);
const panel = rgba(30, 30, 40);
const word = [..."GLYPH"].map((c) => c.codePointAt(0)!);

export function frame(context: Context, cursor: Cursor, out: Frame) {
  const { cols, rows, chars, fg, bg, weight } = out;
  const shift = Math.floor(context.time / 150);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const k = x + y * cols;
      chars[k] = word[(x + y) % word.length]!;
      // Left half: colour bands. Right half: 0, the settings colour (gray).
      fg[k] = x < cols / 2 ? palette[(y + shift) % palette.length]! : 0;
      // Lower half sits on a panel; 0 keeps the settings background.
      bg[k] = y > rows / 2 ? panel : 0;
      // Every other band of 4 columns is bold (7 = 700); 0 = settings.fontWeight.
      weight[k] = Math.floor(x / 4) % 2 ? 7 : 0;
    }
  }

  // FPS box: drawInfo() expects a buffer, asBuffer() lets it write into the frame
  drawbox.drawInfo(context, cursor, asBuffer(out));
}
