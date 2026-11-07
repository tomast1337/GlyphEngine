/**
[header]
@author ertdfgcvb
@title  Coordinates: x, y
@desc   Use of coord.x and coord.y
*/

import type { CellOut, Context, Coord, Cursor } from "glyph-engine";

const density = "Ñ@#W$9876543210?!abc;:+=-,._ ";

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  out: CellOut
) {
  // To generate an output set out.char to a single character,
  // for example out.char = 'x'

  // Shortcuts for frame, cols and coord (x, y)
  const { cols, frame } = context;
  const { x, y } = coord;

  // -1 for even lines, 1 for odd lines
  const sign = (y % 2) * 2 - 1;
  const index = (cols + y + x * sign + frame) % density.length;

  out.char = density[index];
}
