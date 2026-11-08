import { expect, test } from 'bun:test';

import { parseKeys } from '../packages/tui/src/keys';

// Key names with modifiers as prefixes, for short expectations
const names = (text: string) => parseKeys(text).keys.map((k) => (k.ctrlKey ? 'C-' : '') + (k.altKey ? 'A-' : '') + (k.shiftKey ? 'S-' : '') + (k.metaKey ? 'M-' : '') + k.key);

test('printable characters are themselves, by code point; capitals have shift', () => {
    expect(names('aZ 中👋é')).toEqual(['a', 'S-Z', ' ', '中', '👋', 'é']);
});

test('Enter, Backspace, Tab, Escape and Ctrl+letters', () => {
    expect(names('\r\n\x7f\b\t\x0c\x03\x00')).toEqual(['Enter', 'Enter', 'Backspace', 'Backspace', 'Tab', 'C-l', 'C-c', 'C- ']);
    expect(names('\x1b')).toEqual(['Escape']);
});

test('CSI and SS3 keys, with modifiers', () => {
    expect(names('\x1b[A\x1b[B\x1b[C\x1b[D\x1bOA\x1bOH\x1b[F')).toEqual(['ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'Home', 'End']);
    expect(names('\x1b[1~\x1b[4~\x1b[5~\x1b[6~\x1b[3~\x1b[15~\x1bOP')).toEqual(['Home', 'End', 'PageUp', 'PageDown', 'Delete', 'F5', 'F1']);
    expect(names('\x1b[1;5A\x1b[1;2D\x1b[5;3~\x1b[Z')).toEqual(['C-ArrowUp', 'S-ArrowLeft', 'A-PageUp', 'S-Tab']);
});

test('Alt is ESC before a key', () => {
    expect(names('\x1bx\x1b\x7f')).toEqual(['A-x', 'A-Backspace']);
});

test('mouse reports, unknown sequences and other controls are dropped', () => {
    expect(names('a\x1b[<35;10;5M\x1b[<0;1;1mb\x1b[99x\x1c\x85c')).toEqual(['a', 'b', 'c']);
});

test('a sequence cut off at the end comes back as rest', () => {
    expect(parseKeys('a\x1b[1;')).toEqual({ keys: [expect.objectContaining({ key: 'a' })], rest: '\x1b[1;' });
    expect(parseKeys('\x1bO').rest).toBe('\x1bO');
    const { rest } = parseKeys('x\x1b[');
    expect(names(rest + 'A')).toEqual(['ArrowUp']);
});

test('a sequence broken by an unexpected byte is dropped; the keys after it still come through', () => {
    expect(names('\x1b[>0;276;0cabc')).toEqual(['a', 'b', 'c']); // a terminal reply (DA2)
    expect(names('\x1b[ q\x1b[1$yx')).toEqual(['x']); // intermediate bytes
    expect(names('\x1b[1\x07y')).toEqual(['C-g', 'y']); // a control byte inside the sequence: read on its own
    expect(parseKeys('\x1b[>abc').rest).toBe('');
});

test('rest never grows past a short sequence', () => {
    // A sequence that never ends, fed one read at a time
    let pending = '\x1b[';
    let longest = 0;
    for (let i = 0; i < 100; i++) longest = Math.max(longest, (pending = parseKeys(pending + '1;1;1;').rest).length);
    expect(longest).toBeLessThanOrEqual(64);
    expect(names(pending + '\rx')).toContain('x');
});
