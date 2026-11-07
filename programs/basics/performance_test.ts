/**
[header]
@author ertdfgcvb
@title  Perfomance test
@desc   Vertical vs horizontal changes impact FPS
*/

import { drawbox, num } from '@glyph-engine/core';
import type { Buffer, CellOut, Context, Coord, Cursor } from '@glyph-engine/core';
export const settings = { fps: 60 };

const { cos } = Math;

// The colours depend only on the row (or the column while pressed), so they
// are built once per row in pre() instead of once per cell.
const colors: string[] = [];
const backgrounds: string[] = [];

export function pre(context: Context, cursor: Cursor) {
    const f = context.frame * 0.05;
    const n = Math.max(context.cols, context.rows);
    for (let direction = 0; direction < n; direction++) {
        const r1 = num.map(cos(direction * 0.06 + 1 - f), -1, 1, 0, 255);
        const g1 = num.map(cos(direction * 0.07 + 2 - f), -1, 1, 0, 255);
        const b1 = num.map(cos(direction * 0.08 + 3 - f), -1, 1, 0, 255);
        const r2 = num.map(cos(direction * 0.03 + 1 - f), -1, 1, 0, 255);
        const g2 = num.map(cos(direction * 0.04 + 2 - f), -1, 1, 0, 255);
        const b2 = num.map(cos(direction * 0.05 + 3 - f), -1, 1, 0, 255);
        colors[direction] = `rgb(${r2},${g2},${b2})`;
        backgrounds[direction] = `rgb(${r1},${g1},${b1})`;
    }
}

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    // Hold the mouse button to switch the direction
    // of the gradient and observe the drop in FPS.
    // Frequent *horizontal* changes in style will slow down
    // the DOM rendering as each character needs to be
    // wrapped in an individual, inline-styled <span>.
    // Frequent verical changes won’t affect the speed.

    const direction = cursor.pressed ? coord.x : coord.y;

    out.char = String(context.frame % 10);
    out.color = colors[direction]!;
    out.background = backgrounds[direction]!;
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
    drawbox.drawInfo(context, cursor, buffer);
}
