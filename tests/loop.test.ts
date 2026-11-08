import { expect, test } from 'bun:test';

import { type Host, type Settings, startLoop } from '@glyph-engine/core';

// A host whose ticks are driven by hand: tick(t) runs the pending frame callback at time t.
function fakeHost() {
    let pending: ((t: number) => void) | undefined;
    const host: Host & { renders: number } = {
        renders: 0,
        requestFrame: (cb) => void (pending = cb),
        metrics: { aspect: 0.5, cellWidth: 8, lineHeight: 16, fontFamily: 'monospace', fontSize: 16, _update: () => {} },
        size: () => ({ width: 80, height: 32 }),
        pointer: { x: 0, y: 0, pressed: false, px: 0, py: 0, ppressed: false },
        events: [],
        render: () => void host.renders++,
    };
    const tick = (t: number) => {
        const cb = pending;
        pending = undefined;
        cb?.(t);
        return !!pending; // whether another tick was asked for
    };
    return { host, tick };
}

const settings = { fps: 30, once: true } as Settings;

test('once: a tick before the first frame interval waits for the next, then one frame runs', () => {
    const { host, tick } = fakeHost();
    startLoop({ main: () => '#' }, settings, {}, { time: 0, frame: 0, cycle: 0, fps: 30 }, host, () => {});
    expect(tick(5)).toBe(true); // too early (interval is 33 ms): skipped, not dropped
    expect(host.renders).toBe(0);
    expect(tick(40)).toBe(false); // the frame runs; once: no more ticks
    expect(host.renders).toBe(1);
});

test('without once the loop keeps asking for ticks', () => {
    const { host, tick } = fakeHost();
    startLoop({ main: () => '#' }, { ...settings, once: false }, {}, { time: 0, frame: 0, cycle: 0, fps: 30 }, host, () => {});
    expect(tick(40)).toBe(true);
    expect(tick(80)).toBe(true);
    expect(host.renders).toBe(2);
});

test('queued keys reach keyDown in order after the frame, then the queue is empty', () => {
    const { host, tick } = fakeHost();
    const a = { key: 'a', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false };
    host.keys = [a, { ...a, key: 'Enter' }];
    const seen: string[] = [];
    startLoop({ main: () => '#', keyDown: (_c, _cu, _b, key) => void seen.push(key.key) }, settings, {}, { time: 0, frame: 0, cycle: 0, fps: 30 }, host, () => {});
    tick(100);
    expect(seen).toEqual(['a', 'Enter']);
    expect(host.keys).toEqual([]);
});
