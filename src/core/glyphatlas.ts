/**
@module   glyphatlas
@desc     glyph atlas bookkeeping shared by the WebGL2 and WebGPU renderers
@category renderer
*/

import { cellSpan } from './cellspan';
import { type Frame, getChar, GRAPHEME, weightString } from './frame';

export const FLAG_COLOR_GLYPH = 1; // cell flag: keep the glyph's own colours; keep in sync with the shaders

// Glyphs are drawn white, one per slot, by Canvas2D; the renderer uploads each
// one to its texture at (x, y) through `upload`.
export class GlyphAtlas {
    key = ''; // font size + family + slot size the atlas was built for
    slotW = 0;
    slotH = 0;
    perRow = 0;
    capacity = 0;
    next = 1; // slot 0 stays empty: spaces and blank cells
    generation = 0; // bumped whenever slots are forgotten (rebuild or overflow)
    glyphs = new Map<number, Map<number | string, number>>(); // weight code -> code point (or grapheme) -> slot
    colored = new Uint8Array(0); // per slot: emoji etc., keep the glyph's own colours
    wide = new Uint8Array(0); // per slot: glyph covers two cells
    scratch = document.createElement('canvas');
    #ctx = this.scratch.getContext('2d', { willReadFrequently: true })!;

    constructor(
        readonly size: number,
        private upload: (x: number, y: number, glyph: HTMLCanvasElement) => void,
    ) {}

    // Forgets every slot when the font or the cell size in pixels changes (e.g. a
    // devicePixelRatio change). Returns true then: the caller clears its texture.
    ensure(slotW: number, slotH: number, font: string): boolean {
        const key = font + '|' + slotW + 'x' + slotH;
        if (this.key === key) return false;
        this.key = key;
        this.slotW = slotW;
        this.slotH = slotH;
        this.perRow = Math.floor(this.size / slotW);
        this.capacity = this.perRow * Math.floor(this.size / slotH);
        this.colored = new Uint8Array(this.capacity);
        this.wide = new Uint8Array(this.capacity);
        this.#forget();
        this.scratch.width = slotW;
        this.scratch.height = slotH;
        return true;
    }

    // Atlas slot for the glyph in cell k of a frame (0 for spaces and empty cells).
    cellSlot(frame: Frame, k: number, defaultWeight: string, fontSize: number, family: string) {
        const code = frame.chars[k]!;
        if (code === 32 || code === 0) return 0;
        // Grapheme indices belong to one frame (a resize makes a new one): key those by string.
        const key = code >= GRAPHEME ? getChar(frame, k) : code;
        return this.slot(frame.weight[k]!, key, getChar(frame, k), defaultWeight, fontSize, family);
    }

    // Atlas slot for `char` at weight code `weight` (0 = default); draws and
    // uploads it on first use.
    slot(weight: number, key: number | string, char: string, defaultWeight: string, fontSize: number, family: string) {
        let slot = this.glyphs.get(weight)?.get(key);
        if (slot !== undefined) return slot;

        // shortcut: when full, start over; cells already written this frame could point
        // at reused slots. Capacity is thousands of glyphs, so add eviction if that bites.
        if (this.next >= this.capacity) this.#forget();
        slot = this.next++;

        const ctx = this.#ctx;
        ctx.clearRect(0, 0, this.slotW, this.slotH);
        ctx.font = (weight ? weightString(weight) : defaultWeight) + ' ' + fontSize + 'px ' + family;
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'white';
        ctx.fillText(char, 0, 0);
        this.colored[slot] = isColorGlyph(ctx.getImageData(0, 0, this.slotW, this.slotH).data) ? 1 : 0;
        this.wide[slot] = cellSpan(ctx, ctx.font, char, this.slotW / 2) - 1; // slots are two cells wide
        this.upload((slot % this.perRow) * this.slotW, Math.floor(slot / this.perRow) * this.slotH, this.scratch);

        let byChar = this.glyphs.get(weight);
        if (!byChar) this.glyphs.set(weight, (byChar = new Map()));
        byChar.set(key, slot);
        return slot;
    }

    // Packs a frame for a GPU, 4 u32 per cell: atlas slot, fg, bg, flags. `fg` /
    // `bg` replace 0 (settings default) in the frame.
    writeCells(data: Uint32Array, frame: Frame, fg: number, bg: number, fontWeight: string, fontSize: number, family: string) {
        const { cols, rows, fg: fgs, bg: bgs } = frame;
        for (let j = 0; j < rows; j++) {
            // Wide glyphs take two columns and push the rest of the row right (the last
            // cells fall off), like the text renderer; the shader just sees a grid.
            const row = j * cols;
            let col = 0;
            for (let i = 0; i < cols && col < cols; i++) {
                const k = row + i;
                const slot = this.cellSlot(frame, k, fontWeight, fontSize, family);
                const f = fgs[k] || fg;
                const b = bgs[k] || bg;
                let o = (row + col++) * 4;
                data[o] = slot;
                data[o + 1] = f;
                data[o + 2] = b;
                data[o + 3] = this.colored[slot] ? FLAG_COLOR_GLYPH : 0;
                if (this.wide[slot] && col < cols) {
                    // Continuation cell: no glyph, same background; the shader draws the
                    // glyph's right half as overflow from its left neighbour.
                    o = (row + col++) * 4;
                    data[o] = 0;
                    data[o + 1] = f;
                    data[o + 2] = b;
                    data[o + 3] = 0;
                }
            }
        }
    }

    #forget() {
        this.glyphs.clear();
        this.colored.fill(0);
        this.wide.fill(0);
        this.next = 1;
        this.generation++;
    }
}

// Text drawn in white stays grey; emoji bring their own colours.
function isColorGlyph(px: Uint8ClampedArray) {
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3]! > 0 && (px[i] !== px[i + 1] || px[i + 1] !== px[i + 2])) return true;
    }
    return false;
}
