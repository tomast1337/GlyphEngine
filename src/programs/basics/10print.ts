/**
[header]
@author ertdfgcvb
@title  10 PRINT
@desc   10 PRINT CHR$(205.5+RND(1)); : GOTO 10
See also:
https://10print.org
*/

import type { CellOut, Context, Coord, Cursor } from 'glyph-engine';

// Run the program only once
export const settings = {
    once: true,
};

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    // Also try: ╩ ╦ or ▄ ░
    // or any combination from
    // https://play.ertdfgcvb.xyz/abc.html#font:characterset
    out.char = Math.random() < 0.5 ? '╱' : '╲';
}
