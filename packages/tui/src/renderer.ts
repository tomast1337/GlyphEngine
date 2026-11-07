/**
@module   renderer
@desc     draws frames to a terminal with ANSI 24-bit colour escapes
@category renderer
*/

import { cssColor, type Frame, getChar, weightCode } from '@glyph-engine/core';
import type { Settings } from '@glyph-engine/core';

const ESC = '\x1b[';

// Escape for a packed 0xRRGGBBAA colour; 0 or alpha 0 is the terminal's own colour.
// shortcut: partial alpha draws opaque; blend over the background if a program needs it.
function sgr(c: number, layer: 38 | 48) {
    if ((c & 255) === 0) return ESC + (layer + 1) + 'm';
    return ESC + layer + ';2;' + (c >>> 24) + ';' + ((c >>> 16) & 255) + ';' + ((c >>> 8) & 255) + 'm';
}

// One row of the frame as text plus escapes. Wide glyphs take two columns and push
// the rest of the row right (the last cells fall off), like the text renderer.
export function rowString(frame: Frame, y: number, settings: Partial<Settings>): string {
    const { cols, fg, bg, weight } = frame;
    const dFg = (settings.color && cssColor(settings.color)) || 0;
    const dBg = (settings.backgroundColor && cssColor(settings.backgroundColor)) || 0;
    const dWeight = weightCode(settings.fontWeight);
    let s = '';
    let curFg = -1;
    let curBg = -1;
    let curBold = false;
    let col = 0;
    for (let i = 0, k = y * cols; i < cols && col < cols; i++, k++) {
        let ch = getChar(frame, k) || ' ';
        let w = ch === ' ' ? 1 : Bun.stringWidth(ch);
        if (w === 0) {
            // combining marks and control characters alone
            ch = ' ';
            w = 1;
        }
        if (col + w > cols) break;
        const f = fg[k] || dFg;
        const b = bg[k] || dBg;
        const bold = (weight[k] || dWeight) >= 6;
        if (f !== curFg) s += sgr((curFg = f), 38);
        if (b !== curBg) s += sgr((curBg = b), 48);
        if (bold !== curBold) s += (curBold = bold) ? ESC + '1m' : ESC + '22m';
        s += ch;
        col += w;
    }
    // A wide glyph that did not fit at the end: fill with the last background
    return s + ' '.repeat(cols - col) + ESC + '0m';
}

// Draws frames through `write`, rewriting only the rows that changed since the last frame.
export function createRenderer(write: (s: string) => void) {
    let previous: string[] = [];
    let size = '';
    return function render(frame: Frame, settings: Partial<Settings>) {
        let out = '';
        if (size !== (size = frame.cols + 'x' + frame.rows)) {
            out += ESC + '0m' + ESC + '2J'; // first frame or resize: clear everything
            previous = [];
        }
        for (let y = 0; y < frame.rows; y++) {
            const row = rowString(frame, y, settings);
            if (row !== previous[y]) out += ESC + (y + 1) + ';1H' + row;
            previous[y] = row;
        }
        if (out) write(out);
    };
}
