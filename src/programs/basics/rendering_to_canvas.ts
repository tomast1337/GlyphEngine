/**
[header]
@author ertdfgcvb
@title  Canvas renderer
@desc   Rendering to a canvas element
*/
import type { CellOut, Context, Coord, Cursor } from 'glyph-engine';
// A few extra fields are available when choosing the canvas renderer:
// The offset (from top, left) and the size of the canvas element.
export const settings = {
    renderer: 'canvas',
    // Settings available only
    // for the 'canvas' renderer
    canvasOffset: {
        x: 'auto',
        y: 20,
    },
    canvasSize: {
        width: 400,
        height: 500,
    },
    // Universal settings
    cols: 42,
    rows: 22,
    backgroundColor: 'pink',
    color: 'black',
};

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.:!?';

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    const { x, y } = coord;
    const f = context.frame;
    const l = chars.length;
    const c = context.cols;
    out.char = y % 2 ? chars[(y + x + f) % l] : chars[(y + c - x + f) % l];
}
