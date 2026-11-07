/**
@module   out
@desc     the output slot main() writes a cell into
@category core
*/

import { cssColor } from './frame';

// A colour as channels 0-255 (alpha too). Values outside 0-255 are clamped
// when the engine packs it, so shader-style maths needs no clamping.
export class Color {
    r = 0;
    g = 0;
    b = 0;
    a = 255;
    // Assigned as a whole (set()): stored even when equal to the default.
    dirty = false;

    // Any CSS colour ("tomato", "#f00", "rgb(…)") or a packed rgba() number.
    set(c: string | number) {
        if (typeof c == 'number') this.unpack(c);
        else {
            // Most programs assign the same string to every cell: skip the lookup.
            if (c !== this.#css) this.#packed = cssColor((this.#css = c));
            this.unpack(this.#packed);
        }
        this.dirty = true;
    }
    #css = '';
    #packed = 0;

    unpack(p: number) {
        this.r = p >>> 24;
        this.g = (p >>> 16) & 255;
        this.b = (p >>> 8) & 255;
        this.a = p & 255;
    }

    pack(): number {
        return ((ch(this.r) << 24) | (ch(this.g) << 16) | (ch(this.b) << 8) | ch(this.a)) >>> 0;
    }
}

const ch = (v: number) => (v > 255 ? 255 : v > 0 ? v | 0 : 0);

// What main() receives as `out`. The engine owns one, resets it before each
// cell and packs it into the frame right after: no object per cell.
//   out.char         the glyph ("" or undefined: empty)
//   out.color        text colour: assign a CSS string / rgba() number, or set .r .g .b
//   out.background   background colour, the same way
//   out.fontWeight   "bold", 700 …; undefined keeps the cell's weight
// The colours start as the cell's current colour (the settings default if unset).
export class CellOut {
    char: string | undefined = ' ';
    fontWeight: string | number | undefined = undefined;
    #color = new Color();
    #background = new Color();

    get color(): Color {
        return this.#color;
    }
    set color(c: string | number) {
        this.#color.set(c);
    }

    get background(): Color {
        return this.#background;
    }
    set background(c: string | number) {
        this.#background.set(c);
    }
}
