/**
[header]
@author tomast1337
@title  Keys
@desc   Move the @ with the arrow keys or WASD; the last key is shown on top
*/

import type { CellOut, Context, Coord, Key } from '@glyph-engine/core';

let x = 10;
let y = 5;
let last = 'press a key';

const MOVES: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };

// Runs once per key, after the frame; the same names in the browser, the terminal and the desktop
export function keyDown(context: Context, _cursor: unknown, _buffer: unknown, key: Key) {
    last = (key.ctrlKey ? 'Ctrl+' : '') + (key.altKey ? 'Alt+' : '') + (key.shiftKey ? 'Shift+' : '') + (key.metaKey ? 'Meta+' : '') + (key.key === ' ' ? 'Space' : key.key);
    const [dx, dy] = MOVES[key.key.toLowerCase().length === 1 ? key.key.toLowerCase() : key.key] ?? [0, 0];
    x = Math.max(0, Math.min(context.cols - 1, x + dx));
    y = Math.max(1, Math.min(context.rows - 1, y + dy));
}

export function main(coord: Coord, context: Context, _cursor: unknown, out: CellOut) {
    if (coord.y === 0) {
        out.char = last[coord.x] ?? ' ';
        out.color = 'white';
        out.background = 'royalblue';
    } else if (coord.x === x && coord.y === y) {
        out.char = '@';
        out.color = 'tomato';
        out.fontWeight = 'bold';
    } else {
        out.char = (coord.x + coord.y) % 2 ? '·' : ' ';
    }
}
