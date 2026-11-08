import { expect, test } from 'bun:test';

import type { CellOut, Coord, Key } from '@glyph-engine/core';

import { run } from '../packages/tui/src/run';

const hash = (_p: Coord, _c: unknown, _cu: unknown, out: CellOut) => void (out.char = '#');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Input that yields the given chunks one by one, then stays open
async function* input(...chunks: (string | Uint8Array)[]) {
    for (const c of chunks) {
        await wait(20);
        yield c;
    }
    await new Promise(() => {});
}

test('frames go to io.write at io.size; keys come from io.input; abort leaves the terminal modes and stops', async () => {
    let out = '';
    const keys: string[] = [];
    const abort = new AbortController();
    const program = { main: hash, keyDown: (_c: unknown, _cu: unknown, _b: unknown, k: Key) => void keys.push(k.key) };
    await run(program, { fps: 60 }, {}, { write: (s) => void (out += s), size: () => ({ cols: 3, rows: 2 }), input: input('a', new TextEncoder().encode('\x1b[A'), '\x03'), signal: abort.signal });
    await wait(120);
    expect(out).toContain('\x1b[?1049h'); // alternate screen and mouse modes: bytes for the remote terminal
    expect(out).toContain('###');
    expect(keys).toEqual(['a', 'ArrowUp', 'c']); // Ctrl+C is a key here, the process is left alone
    abort.abort();
    expect(out.endsWith('\x1b[?1049l')).toBe(true);
    const length = out.length;
    await wait(50);
    expect(out.length).toBe(length); // no more frames
});

test('an error after the first frame reaches io.onError and stops the loop', async () => {
    let frame = 0;
    let error: unknown;
    let out = '';
    await run(
        {
            main: hash,
            pre: () =>
                void (
                    frame++ === 2 &&
                    (() => {
                        throw new Error('boom');
                    })()
                ),
        },
        { fps: 60 },
        {},
        { write: (s) => void (out += s), onError: (e) => (error = e) },
    );
    await wait(150);
    expect((error as Error)?.message).toBe('boom');
    expect(out.endsWith('\x1b[?1049l')).toBe(true);
});

test('an error in the first frame rejects', async () => {
    await expect(
        run(
            {
                main: () => {
                    throw new Error('first');
                },
            },
            {},
            {},
            { write: () => {} },
        ),
    ).rejects.toThrow('first');
});

test('frames are skipped while io.ready() is false', async () => {
    let frames = 0;
    let ready = false;
    const abort = new AbortController();
    run({ main: hash }, { fps: 60 }, {}, { write: (s) => void (s.includes('#') && frames++), size: () => ({ cols: 2, rows: 1 }), ready: () => ready, signal: abort.signal });
    await wait(80);
    expect(frames).toBe(0);
    ready = true;
    await wait(80);
    expect(frames).toBe(1); // the row is written once; later frames are unchanged
    abort.abort();
});

test('a mouse report split across two reads still arrives', async () => {
    let downs = 0;
    const abort = new AbortController();
    await run({ main: hash, pointerDown: () => void downs++ }, { fps: 60 }, {}, { write: () => {}, input: input('\x1b[<0;5;', '3M'), signal: abort.signal });
    await wait(120);
    abort.abort();
    expect(downs).toBe(1);
});
