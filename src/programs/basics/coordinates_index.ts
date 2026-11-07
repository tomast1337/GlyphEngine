/**
[header]
@author ertdfgcvb
@title  Coordinates: index
@desc   Use of coord.index
*/

import type { CellOut, Context, Coord, Cursor } from 'glyph-engine';

// Global variables have scope in the whole module.
const pattern = '| |.|,|:|;|x|K|Ñ|R|a|+|=|-|_';
// const pattern = '| |▁|▂|▃|▄|▅|▆|▇|▆|▅|▄|▃|▂|▁'

// Resize the browser window to modify the pattern.
export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    const i = coord.index % pattern.length;
    out.char = pattern[i];
}
