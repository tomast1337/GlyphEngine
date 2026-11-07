/**
[header]
@author ertdfgcvb
@title  Simple output
@desc   The smallest program possible?
*/

import type { CellOut, Context, Coord, Cursor } from "glyph-engine";

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
  out.char = "?";
}

// Shorter:
// export const main = (c, x, u, o) => { o.char = '?' }

// Even shorter:
// export let main=(c,x,u,o)=>o.char='?'
