import { afterAll, expect, test } from 'bun:test';

import type { Program } from '@glyph-engine/core';

import { run } from '../packages/web/src/run';

// Just enough DOM for run() to boot: fonts ready, frames on a timer, a fake element.
const g = globalThis as Record<string, unknown>;
const saved = Object.fromEntries(['document', 'requestAnimationFrame', 'ResizeObserver', 'getComputedStyle', 'window'].map((k) => [k, g[k]]));
// Listeners added and not yet removed through their { signal }, and connected ResizeObservers
let listeners = 0;
let observers = 0;
const addEventListener = (_type: string, _fn: unknown, options?: { signal?: AbortSignal }) => {
    listeners++;
    options?.signal?.addEventListener('abort', () => listeners--);
};
const node = () => ({
    nodeName: 'PRE',
    style: {},
    dataset: {},
    addEventListener,
    childNodes: [] as unknown[],
    get childElementCount() {
        return this.childNodes.length;
    },
    appendChild(child: unknown) {
        this.childNodes.push(child);
    },
    removeChild() {
        this.childNodes.pop();
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 80, height: 32 }),
});
g.document = { fonts: { ready: Promise.resolve() }, createElement: node };
g.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(performance.now() + 1000), 0);
g.ResizeObserver = class {
    observe() {
        observers++;
    }
    disconnect() {
        observers--;
    }
};
g.window = { addEventListener };
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

test('aborting settings.signal stops the frames and removes every listener and observer', async () => {
    let frames = 0;
    const abort = new AbortController();
    const [l, o] = [listeners, observers]; // earlier tests leave some behind
    await run({ main: () => void frames++, keyDown() {} }, { element, signal: abort.signal });
    expect(listeners).toBeGreaterThan(l);
    expect(observers).toBe(o + 1);
    abort.abort();
    const after = frames;
    await new Promise((r) => setTimeout(r, 30));
    expect(frames).toBe(after);
    expect(listeners).toBe(l);
    expect(observers).toBe(o);
});

test('an aborted signal rejects run() before the first frame', async () => {
    await expect(run({ main() {} }, { element, signal: AbortSignal.abort(new Error('stopped')) })).rejects.toThrow('stopped');
});
