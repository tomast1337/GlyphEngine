/**
[header]
@author ertdfgcvb
@title  Coordinates: index
@desc   Use of coord.index
*/

import type { Buffer, Context, Coord, Cursor } from "glyph-engine";

// Global variables have scope in the whole module.
const pattern = "| |.|,|:|;|x|K|Ñ|R|a|+|=|-|_";
// const pattern = '| |▁|▂|▃|▄|▅|▆|▇|▆|▅|▄|▃|▂|▁'

// Resize the browser window to modify the pattern.
export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const i = coord.index % pattern.length;
  return pattern[i];
}
