/**
[header]
@author ertdfgcvb
@title  Cursor
@desc   Crosshair example with mouse cursor
*/

import { drawInfo } from "../../modules/drawbox";
import  type { Buffer, Context, Coord, Cursor } from "../../modules";

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  // The cursor coordinates are mapped to the cell
  // (fractional, needs rounding).
  const x = Math.floor(cursor.x); // column of the cell hovered
  const y = Math.floor(cursor.y); // row of the cell hovered

  if (coord.x == x && coord.y == y) return "┼";
  if (coord.x == x) return "│";
  if (coord.y == y) return "─";
  return (coord.x + coord.y) % 2 ? "·" : " ";
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
