import { expect, test } from 'bun:test';

import { keyFrom } from '../packages/desktop/src/keys';

test('SDL keycodes become browser key names, with modifiers', () => {
    expect(keyFrom(0x61, 0)).toEqual({ key: 'a', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false });
    expect(keyFrom(0x41, 0x0001)).toMatchObject({ key: 'A', shiftKey: true });
    expect(keyFrom(0x6c, 0x0040)).toMatchObject({ key: 'l', ctrlKey: true });
    expect(keyFrom(0x40000052, 0x0200)).toMatchObject({ key: 'ArrowUp', altKey: true });
    expect([0x0d, 0x1b, 0x08, 0x09, 0x20, 0x4000003a, 0x40000045, 0x4000004b].map((k) => keyFrom(k, 0)?.key)).toEqual(['Enter', 'Escape', 'Backspace', 'Tab', ' ', 'F1', 'F12', 'PageUp']);
});

test('modifier keys alone and other non-character keys are not sent', () => {
    expect(keyFrom(0x400000e1, 0x0001)).toBeUndefined(); // left Shift
    expect(keyFrom(0x40000081, 0)).toBeUndefined(); // volume up
});
