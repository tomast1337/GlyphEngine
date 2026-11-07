import { expect, test } from 'bun:test';

import { createFrame, rgba, setChar } from '@glyph-engine/core';

import { createRenderer, rowString } from '../packages/tui/src/renderer';

const row = (s: string) => {
    const f = createFrame([...s].length, 1);
    [...s].forEach((c, i) => setChar(f, i, c));
    return f;
};

test('a row: colours only where they change, terminal defaults for 0, reset at the end', () => {
    const f = row('ab ');
    f.fg[0] = f.fg[1] = rgba(255, 0, 0);
    f.bg[2] = rgba(0, 0, 255);
    expect(rowString(f, 0, {})).toBe('\x1b[38;2;255;0;0m\x1b[49mab\x1b[39m\x1b[48;2;0;0;255m \x1b[0m');
});

test('settings colours fill default cells; bold from weight 600 up', () => {
    const f = row('x');
    f.weight[0] = 7;
    expect(rowString(f, 0, { color: 'white', backgroundColor: 'black' })).toBe('\x1b[38;2;255;255;255m\x1b[48;2;0;0;0m\x1b[1mx\x1b[0m');
});

test('wide glyphs push the row right; one that does not fit is left out', () => {
    expect(rowString(row('👋ab'), 0, {})).toBe('\x1b[39m\x1b[49m👋a\x1b[0m');
    expect(rowString(row('ab👋'), 0, {})).toBe('\x1b[39m\x1b[49mab \x1b[0m');
});

test('the renderer clears on the first frame and resize, then rewrites only changed rows', () => {
    const out: string[] = [];
    const render = createRenderer((s) => out.push(s));
    const f = createFrame(2, 2);
    render(f, {});
    expect(out[0]).toStartWith('\x1b[0m\x1b[2J\x1b[1;1H');
    render(f, {});
    expect(out.length).toBe(1); // nothing changed: nothing written
    setChar(f, 3, 'z');
    render(f, {});
    expect(out[1]).toBe('\x1b[2;1H\x1b[39m\x1b[49m z\x1b[0m');
    render(createFrame(3, 2), {});
    expect(out[2]).toStartWith('\x1b[0m\x1b[2J');
});
