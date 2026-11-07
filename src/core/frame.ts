/**
@module   frame
@desc     the cell grid as typed arrays: what main() writes (through `out`) and renderers read
@category core
*/

import type { Buffer, Cell } from '../modules/buffer';

// chars[i] >= GRAPHEME: index into frame.graphemes (glyphs made of several code points)
export const GRAPHEME = 0x80000000;

export interface Frame {
    cols: number;
    rows: number;
    chars: Uint32Array; // code point (0 = empty, 32 = space), or GRAPHEME + index
    fg: Uint32Array; // 0xRRGGBBAA; 0 = settings.color
    bg: Uint32Array; // 0xRRGGBBAA; 0 = settings.backgroundColor
    weight: Uint8Array; // fontWeight / 100; 0 = settings.fontWeight
    graphemes: string[]; // interned: an index keeps its string for the frame's lifetime
    graphemeIndex: Map<string, number>;
    // Legacy beginHTML / endHTML cell fields, used by the text renderer only
    html: Map<number, { begin?: string; end?: string }>;
}

export function createFrame(cols: number, rows: number): Frame {
    const n = cols * rows;
    return {
        cols,
        rows,
        chars: new Uint32Array(n).fill(32),
        fg: new Uint32Array(n),
        bg: new Uint32Array(n),
        weight: new Uint8Array(n),
        graphemes: [],
        graphemeIndex: new Map(),
        html: new Map(),
    };
}

// Packs a colour; channels 0-255. rgba(0, 0, 0, 0) == 0 means "default colour".
export function rgba(r: number, g: number, b: number, a = 255): number {
    return (((r & 255) << 24) | ((g & 255) << 16) | ((b & 255) << 8) | (a & 255)) >>> 0;
}

// Packs any CSS colour string (cached). Unknown strings give 0 (default colour).
const cssCache = new Map<string, number>();
let normalizer: { fillStyle: unknown } | null | undefined;
export function cssColor(css: string): number {
    let v = cssCache.get(css);
    if (v !== undefined) return v;
    if (normalizer === undefined) {
        // The browser turns any CSS colour into "#rrggbb" or "rgba(r, g, b, a)".
        // Without a DOM (tests) only those two forms and rgb() are understood.
        normalizer = typeof OffscreenCanvas != 'undefined' ? new OffscreenCanvas(1, 1).getContext('2d') : typeof document != 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    }
    let s = css;
    if (normalizer) {
        normalizer.fillStyle = '#00000000'; // an invalid string leaves this value
        normalizer.fillStyle = css;
        s = String(normalizer.fillStyle);
    }
    v = 0;
    if (/^#[0-9a-f]{6}$/i.test(s)) {
        v = ((parseInt(s.slice(1), 16) << 8) | 255) >>> 0;
    } else if (/^rgba?\(/.test(s)) {
        const [r = 0, g = 0, b = 0, a = 1] = s
            .slice(s.indexOf('(') + 1, -1)
            .split(/[\s,/]+/)
            .filter(Boolean)
            .map(Number);
        v = rgba(Math.round(r), Math.round(g), Math.round(b), Math.round(a * 255));
    }
    // shortcut: programs building a new colour string per cell grow this; drop it
    // all past this size rather than tracking use.
    if (cssCache.size > 65536) cssCache.clear();
    cssCache.set(css, v);
    return v;
}

// Packed colour back to a CSS string, for the canvas and text renderers (cached).
const colorStrings = new Map<number, string>();
export function colorString(c: number): string {
    let s = colorStrings.get(c);
    if (s === undefined) {
        const a = c & 255;
        const rgb = `${c >>> 24},${(c >>> 16) & 255},${(c >>> 8) & 255}`;
        s = a === 255 ? `rgb(${rgb})` : `rgba(${rgb},${+(a / 255).toFixed(3)})`;
        if (colorStrings.size > 65536) colorStrings.clear(); // shortcut: as cssCache
        colorStrings.set(c, s);
    }
    return s;
}

// Writes one glyph (a single grapheme) into cell i.
export function setChar(f: Frame, i: number, s: string) {
    const cp = s.codePointAt(0);
    if (cp === undefined) f.chars[i] = 0;
    else if (s.length === (cp > 0xffff ? 2 : 1)) f.chars[i] = cp;
    else {
        let k = f.graphemeIndex.get(s);
        // shortcut: interned for the frame's lifetime; a program producing endless
        // distinct multi-code-point glyphs grows this until the grid is resized.
        if (k === undefined) f.graphemeIndex.set(s, (k = f.graphemes.push(s) - 1));
        f.chars[i] = GRAPHEME + k;
    }
}

const singles: string[] = [];
// The glyph in cell i as a string ("" for an empty cell).
export function getChar(f: Frame, i: number): string {
    const c = f.chars[i]!;
    if (c >= GRAPHEME) return f.graphemes[c - GRAPHEME]!;
    if (c < 0x10000) return (singles[c] ??= c === 0 ? '' : String.fromCharCode(c));
    return String.fromCodePoint(c);
}

// "bold", "400", 700 ... to the stored weight code and back.
export function weightCode(w: string | number | undefined): number {
    if (w === undefined || w === '') return 0;
    if (w === 'bold') return 7;
    if (w === 'normal') return 4;
    return Math.min(255, Math.max(0, Math.round(Number(w) / 100) || 0));
}
export function weightString(code: number): string {
    return String(code * 100);
}

// An array-like view of a frame as cell objects, so buffer helpers (drawBox,
// drawInfo, mergeText, ...) work on frames. Each access converts: fine for a
// box or a line of text, slow for the whole grid.
export function asBuffer(f: Frame): Buffer {
    const n = f.cols * f.rows;
    const toIndex = (key: string | symbol) => (typeof key === 'string' ? Number(key) : NaN);
    return new Proxy([] as Buffer, {
        get(target, key) {
            if (key === 'length') return n;
            const i = toIndex(key);
            if (!(i >= 0 && i < n)) return Reflect.get(target, key);
            const cell: Cell = { char: getChar(f, i) };
            if (f.fg[i]) cell.color = colorString(f.fg[i]!);
            if (f.bg[i]) cell.backgroundColor = colorString(f.bg[i]!);
            if (f.weight[i]) cell.fontWeight = weightString(f.weight[i]!);
            return cell;
        },
        set(target, key, cell: Cell) {
            const i = toIndex(key);
            if (!(i >= 0 && i < n)) return Reflect.set(target, key, cell);
            setChar(f, i, cell.char == null ? ' ' : String(cell.char));
            f.fg[i] = cell.color ? cssColor(cell.color) : 0;
            f.bg[i] = cell.backgroundColor ? cssColor(cell.backgroundColor) : 0;
            f.weight[i] = weightCode(cell.fontWeight);
            return true;
        },
    });
}
