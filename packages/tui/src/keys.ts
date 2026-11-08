/**
@module   keys
@desc     terminal input to browser key names
@category tui
*/

import type { Key } from '@glyph-engine/core';

// CSI / SS3 final bytes, and CSI "n~" numbers, to key names
const FINAL: Record<string, string> = { A: 'ArrowUp', B: 'ArrowDown', C: 'ArrowRight', D: 'ArrowLeft', H: 'Home', F: 'End', P: 'F1', Q: 'F2', R: 'F3', S: 'F4' };
const TILDE: Record<string, string> = { 1: 'Home', 2: 'Insert', 3: 'Delete', 4: 'End', 5: 'PageUp', 6: 'PageDown', 7: 'Home', 8: 'End', 15: 'F5', 17: 'F6', 18: 'F7', 19: 'F8', 20: 'F9', 21: 'F10', 23: 'F11', 24: 'F12' };
const CSI = /^\x1b\[([0-9;<?]*)([\x40-\x7e])?/;

const key = (name: string, mods = 0): Key => ({ key: name, shiftKey: !!(mods & 1), altKey: !!(mods & 2), ctrlKey: !!(mods & 4), metaKey: !!(mods & 8) });

// One key at text[i] (not an escape sequence) and its length; undefined key for dropped input.
function plain(text: string, i: number): [Key | undefined, number] {
    const c = text.codePointAt(i)!;
    const ch = String.fromCodePoint(c);
    if (ch === '\r' || ch === '\n') return [key('Enter'), 1];
    if (ch === '\x7f' || ch === '\b') return [key('Backspace'), 1];
    if (ch === '\t') return [key('Tab'), 1];
    if (c === 0) return [key(' ', 4), 1]; // Ctrl+Space
    if (c <= 0x1a) return [key(String.fromCharCode(c + 96), 4), 1]; // Ctrl+letter
    if (c < 0x20 || (c >= 0x80 && c <= 0x9f)) return [undefined, 1]; // other C0 and C1 controls
    return [key(ch, ch !== ch.toLowerCase() ? 1 : 0), ch.length];
}

/**
Parses raw terminal input into keys. `rest` is an escape sequence cut off at the end
of `text`: pass it in front of the next read. Mouse reports and unknown sequences are dropped.
*/
export function parseKeys(text: string): { keys: Key[]; rest: string } {
    const keys: Key[] = [];
    let i = 0;
    while (i < text.length) {
        if (text[i] !== '\x1b') {
            const [k, n] = plain(text, i);
            if (k) keys.push(k);
            i += n;
        } else if (i + 1 === text.length) {
            keys.push(key('Escape')); // shortcut: a lone ESC at the end is Escape, not the start of a split sequence; add a timeout if terminals split them
            i++;
        } else if (text[i + 1] === '[') {
            const m = CSI.exec(text.slice(i));
            if (!m?.[2]) return { keys, rest: text.slice(i) }; // no final byte yet
            const [whole, params, final] = m;
            const [first = '', mod = '1'] = params!.split(';');
            const name = final === '~' ? TILDE[first] : final === 'Z' ? 'Tab' : params!.startsWith('<') ? undefined : FINAL[final!];
            if (name) keys.push(key(name, (Number(mod) - 1) | (final === 'Z' ? 1 : 0)));
            i += whole.length;
        } else if (text[i + 1] === 'O') {
            if (i + 2 === text.length) return { keys, rest: text.slice(i) };
            const name = FINAL[text[i + 2]!];
            if (name) keys.push(key(name));
            i += 3;
        } else {
            // ESC before a key: Alt+key
            const [k, n] = plain(text, i + 1);
            if (k) keys.push({ ...k, altKey: true });
            i += 1 + n;
        }
    }
    return { keys, rest: '' };
}
