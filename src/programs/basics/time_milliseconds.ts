/**
[header]
@author ertdfgcvb
@title  Time: milliseconds
@desc   Use of context.time
*/
import { drawbox } from "glyph-engine";
import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";

// Globals have module scope
const pattern = "ABCxyz01═|+:. ";

// This is the main loop.
// Character coordinates are passed in coord {x, y, index}.
// The function writes the cell into out:
// out.char, out.color, out.background, out.fontWeight.
export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  out: CellOut
) {
  const t = context.time * 0.0001;
  const x = coord.x;
  const y = coord.y;
  const o = Math.sin(y * Math.sin(t) * 0.2 + x * 0.04 + t) * 20;
  const i = Math.round(Math.abs(x + y + o)) % pattern.length;
  out.char = pattern[i];
  out.fontWeight = "100"; // or 'light', 'bold', '400'
}

// This function is called after the main loop and is useful
// to manipulate the buffer; in this case with a window overlay.
export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  // An extra object can be passed to drawInfo to alter the default style
  drawbox.drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
