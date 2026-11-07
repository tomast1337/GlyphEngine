/**
@module   computeframe
@desc     runs a program for one frame: pre(), main() per cell, post()
@category core
*/

import { asBuffer, cssColor, type Frame, setChar, weightCode } from './frame';
import type { Buffer } from './modules/buffer';
import { CellOut } from './out';
import type { Context, Cursor, Program } from './program';

// The frame as a buffer of cell objects, for pre(), post(), boot() and events
// (drawInfo() and other buffer helpers work on it). One view per frame.
const views = new WeakMap<Frame, Buffer>();
export function bufferOf(frame: Frame): Buffer {
    let b = views.get(frame);
    if (!b) views.set(frame, (b = asBuffer(frame)));
    return b;
}

// Runs pre(), main() for every cell and post(), writing into `frame`.
// No platform access: every runner calls it, as do the tests and the benchmark.
// onGpu: main() runs on the GPU; the frame is cleared to empty cells (char 0)
// so that it holds only what pre() and post() draw on top.
export function computeFrame(program: Program, context: Context, cursor: Cursor, frame: Frame, userData: object = {}, onGpu = false) {
    const buffer = bufferOf(frame);
    frame.html.clear();
    if (onGpu) {
        frame.chars.fill(0);
        frame.fg.fill(0);
        frame.bg.fill(0);
        frame.weight.fill(0);
    }

    if (typeof program.pre == 'function') {
        program.pre(context, cursor, buffer, userData);
    }

    if (typeof program.main == 'function' && !onGpu) {
        const { chars, fg, bg, weight } = frame;
        const settings = context.settings;
        // Packed settings colours, for cells still at their default (0). Opaque
        // black when unset, so setting one channel never yields a transparent colour.
        const dFg = (settings.color && cssColor(settings.color)) || 0x000000ff;
        const dBg = (settings.backgroundColor && cssColor(settings.backgroundColor)) || 0x000000ff;
        const dWeight = weightCode(settings.fontWeight);
        const out = new CellOut();
        const color = out.color;
        const background = out.background;
        const coord = { x: 0, y: 0, index: 0 }; // reused for every cell

        for (let y = 0, k = 0; y < context.rows; y++) {
            for (let x = 0; x < context.cols; x++, k++) {
                coord.x = x;
                coord.y = y;
                coord.index = k;
                // Reset the slot: an empty glyph, the cell's current colours
                out.char = ' ';
                out.fontWeight = undefined;
                const f0 = fg[k]!,
                    b0 = bg[k]!;
                const fl = f0 || dFg,
                    bl = b0 || dBg;
                color.unpack(fl);
                background.unpack(bl);
                color.dirty = background.dirty = false;

                program.main(coord, context, cursor, out, userData);

                // Pack the slot into the frame
                const c = out.char;
                if (typeof c == 'string' && c.length === 1) chars[k] = c.charCodeAt(0);
                else if (c == null) chars[k] = 32;
                else setChar(frame, k, c);
                const fp = color.pack(),
                    bp = background.pack();
                // Untouched: keep 0 (= default) as 0.
                // shortcut: channel writes that land exactly on the default when the
                // settings colour is unset stay "default"; track channel writes if it bites.
                fg[k] = fp === fl && !color.dirty ? f0 : fp;
                bg[k] = bp === bl && !background.dirty ? b0 : bp;
                const w = out.fontWeight;
                if (w !== undefined) {
                    const wc = weightCode(w);
                    weight[k] = wc === dWeight ? 0 : wc;
                }
            }
        }
    }

    if (typeof program.post == 'function') {
        program.post(context, cursor, buffer, userData);
    }
}
