/**
[header]
@author Nicolas Vyčas Nery
@title  Colors and weight
@desc   Packing colours once, font weight, and 0 as "use the default"
*/

import { cssColor, rgba, drawbox } from "glyph-engine";
import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";

export const settings = { backgroundColor: "black", color: "gray", fontWeight: "400" };

// Colours are numbers. Pack them once, outside main(), and reuse them:
// cssColor() takes any CSS colour, rgba() takes channels 0-255.
const palette = ["crimson", "orange", "gold", "seagreen", "royalblue", "purple"].map(cssColor);
const panel = rgba(30, 30, 40);
const word = "GLYPH";

// The same for every cell: computed once per frame in pre()
let shift = 0;

export function pre(context: Context) {
  shift = Math.floor(context.time / 150);
}

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
  const { cols, rows } = context;
  const { x, y } = coord;
  out.char = word[(x + y) % word.length];
  // Left half: colour bands. Right half: 0, the settings colour (gray).
  out.color = x < cols / 2 ? palette[(y + shift) % palette.length]! : 0;
  // Lower half sits on a panel; 0 keeps the settings background.
  out.background = y > rows / 2 ? panel : 0;
  // Every other band of 4 columns is bold; 0 = settings.fontWeight.
  out.fontWeight = Math.floor(x / 4) % 2 ? "700" : 0;
}

// FPS box
export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawbox.drawInfo(context, cursor, buffer);
}
