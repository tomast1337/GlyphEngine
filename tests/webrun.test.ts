import { afterAll, expect, test } from 'bun:test';

import type { Program } from '@glyph-engine/core';

import { run } from '../packages/web/src/run';

// Just enough DOM for run() to boot: fonts ready, frames on a timer, a fake element.
const g = globalThis as Record<string, unknown>;
const saved = Object.fromEntries(['document', 'requestAnimationFrame', 'ResizeObserver', 'getComputedStyle'].map((k) => [k, g[k]]));
const node = () => ({
    nodeName: 'PRE',
    style: {},
    dataset: {},
    addEventListener() {},
    appendChild() {},
    removeChild() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 80, height: 32 }),
});
g.document = { fonts: { ready: Promise.resolve() }, createElement: node };
g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(performance.now() + 1000), 0);
g.ResizeObserver = class {
    observe() {}
};
g.getComputedStyle = () => ({ getPropertyValue: (p: string) => (p == 'font-family' ? 'monospace' : '16px') });
afterAll(() => Object.assign(g, saved));

const element = node() as unknown as HTMLElement;

test('web run() rejects when boot() throws', async () => {
    const program: Program = {
        boot() {
            throw new Error('boot');
        },
        main() {},
    };
    await expect(run(program, { element })).rejects.toThrow('boot');
});

test('web run() rejects when the first frame throws', async () => {
    const program: Program = {
        main() {
            throw new Error('frame');
        },
    };
    await expect(run(program, { element })).rejects.toThrow('frame');
});
