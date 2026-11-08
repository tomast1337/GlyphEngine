import type { Context, Cursor, Program } from '@glyph-engine/core';
// Runs a program without the DOM: fixed metrics, fixed time step, no input.
// Shared by the snapshot tests and the benchmark's computation timing.
import { computeFrame, createFrame } from '@glyph-engine/core';

const metrics = {
    aspect: 0.5,
    cellWidth: 8,
    lineHeight: 16,
    fontFamily: 'monospace',
    fontSize: 13,
};
const cursor = {
    x: 0,
    y: 0,
    pressed: false,
    p: { x: 0, y: 0, pressed: false },
} as Cursor;

export function makeRunner(program: Program, cols: number, rows: number) {
    const settings = { fps: 30, ...program.settings } as Context['settings'];
    const interval = 1000 / settings.fps;
    const out = createFrame(cols, rows);
    let frame = 0;
    // One engine frame; returns the frame the renderers would draw.
    return function step() {
        frame++;
        const context = Object.freeze({
            frame,
            time: frame * interval,
            delta: frame === 1 ? 0 : interval,
            cols,
            rows,
            metrics,
            width: cols * metrics.cellWidth,
            height: rows * metrics.lineHeight,
            settings,
            runtime: Object.freeze({ cycle: 0, fps: settings.fps }),
        }) as Context;
        computeFrame(program, context, cursor, out);
        return out;
    };
}
