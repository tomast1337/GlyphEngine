import { expect, test } from 'bun:test';

import canvasRenderer from '../src/core/canvasrenderer';
import { createFrame, setChar, weightCode } from '../src/core/frame';
import type { Context } from '../src/program';

// A one-row frame from cells like { char, fontWeight }.
function frameOf(cells: { char: string; fontWeight?: string }[]) {
    const f = createFrame(cells.length, 1);
    cells.forEach((c, i) => {
        setChar(f, i, c.char);
        f.weight[i] = weightCode(c.fontWeight);
    });
    return f;
}

// Fake 2d context: records ctx.font at every fillText.
function fakeCanvas() {
    const fonts: string[] = [];
    const ctx = {
        font: '',
        fillRect() {},
        save() {},
        restore() {},
        scale() {},
        translate() {},
        measureText: () => ({ width: 8 }),
        fillText() {
            fonts.push(ctx.font);
        },
    };
    return { fonts, canvas: { style: {}, getContext: () => ctx } };
}

test('canvas renderer uses settings.fontWeight for cells without their own', () => {
    Object.assign(globalThis, { devicePixelRatio: 1 });
    const { fonts, canvas } = fakeCanvas();
    const context = {
        cols: 2,
        rows: 1,
        width: 16,
        height: 16,
        metrics: {
            cellWidth: 8,
            lineHeight: 16,
            fontSize: 16,
            fontFamily: 'monospace',
        },
        settings: { element: canvas, color: 'white', fontWeight: '700' },
    } as unknown as Context;

    canvasRenderer.render(context, frameOf([{ char: 'A' }, { char: 'B', fontWeight: '100' }]));

    expect(fonts).toEqual(['700 16px monospace', '100 16px monospace']);
});

test('canvas renderer gives wide glyphs two cells, pushing the row right', () => {
    Object.assign(globalThis, { devicePixelRatio: 1 });
    const drawn: [string, number][] = [];
    const ctx = {
        font: '',
        fillRect() {},
        save() {},
        restore() {},
        scale() {},
        translate() {},
        measureText: (s: string) => ({ width: s === '🌮' ? 16 : 8 }),
        fillText: (s: string, x: number) => drawn.push([s, x]),
    };
    const context = {
        cols: 3,
        rows: 1,
        width: 24,
        height: 16,
        metrics: {
            cellWidth: 8,
            lineHeight: 16,
            fontSize: 16,
            fontFamily: 'monospace',
        },
        settings: { element: { style: {}, getContext: () => ctx } },
    } as unknown as Context;

    canvasRenderer.render(context, frameOf([{ char: '🌮' }, { char: 'A' }, { char: 'B' }]));

    expect(drawn).toEqual([
        ['🌮', 0],
        ['A', 16],
    ]); // "B" no longer fits
});
