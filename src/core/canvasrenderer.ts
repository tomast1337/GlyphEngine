/**
@module   canvasrenderer
@desc     renders to canvas
@category renderer
*/

import type { Context } from '../program';
import { fitCanvas } from './canvassize';
import { cellSpan } from './cellspan';
import { colorString, cssColor, type Frame, getChar, weightString } from './frame';
import type { Render } from './renderer';

export default {
    preferredElementNodeName: 'CANVAS',
    render,
} as Render;

function render(context: Context, frame: Frame) {
    const canvas = context.settings.element as HTMLCanvasElement;

    const scale = devicePixelRatio;

    const c = context.cols;
    const r = context.rows;
    const m = context.metrics;

    const cw = m.cellWidth;
    const ch = Math.round(m.lineHeight);

    // Shortcut
    const settings = context.settings;

    fitCanvas(canvas, context, scale);

    const ff = ' ' + m.fontSize + 'px ' + m.fontFamily;
    const bg = settings && settings.backgroundColor ? settings.backgroundColor : 'white';
    const fg = settings && settings.color ? settings.color : 'black';
    const fontWeight = settings && settings.fontWeight ? settings.fontWeight : '400';

    // Set the backgroundColor of the box-element
    // canvas.style.backgroundColor = settings.backgroundColor || 'white'

    // Transparent canvas backround for the remaining size
    // (fractions of cellWidth and lineHeight).
    // Only the 'rendered' area has a solid color.
    const ctx = canvas.getContext('2d');
    //ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!ctx) throw new Error('Canvas not supported');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.fillStyle = fg;
    ctx.textBaseline = 'top';

    // Custom settings: it’s possible to center the canvas
    if (settings.canvasOffset) {
        const offs = settings.canvasOffset;
        const ox = Math.round(offs.x == 'auto' ? (canvas.width / scale - c * cw) / 2 : offs.x);
        const oy = Math.round(offs.y == 'auto' ? (canvas.height / scale - r * ch) / 2 : offs.y);
        ctx.translate(ox, oy);
    }

    const { chars, fg: fgs, bg: bgs, weight } = frame;
    // Cells with the canvas background need no rect (as when cells held strings)
    const bgPacked = cssColor(bg);
    // Font string per weight code (0 = settings.fontWeight)
    const fonts: string[] = [];
    const fontOf = (w: number) => (fonts[w] ??= (w ? weightString(w) : fontWeight) + ff);

    // Center patch with cell bg color...
    // a bit painful and needs some opt.
    if (settings.textAlign == 'center') {
        const widths: number[] = []; // reused for every row
        for (let j = 0; j < r; j++) {
            const offs = j * c;
            let totalWidth = 0;

            // Find width
            for (let i = 0; i < c; i++) {
                ctx.font = fontOf(weight[offs + i]!);
                const w = ctx.measureText(getChar(frame, offs + i)).width;
                totalWidth += w;
                widths[i] = w;
            }
            // Draw
            let ox = (canvas.width / scale - totalWidth) * 0.5;
            const y = j * ch;
            for (let i = 0; i < c; i++) {
                const k = offs + i;
                const x = ox;
                if (bgs[k] && bgs[k] !== bgPacked) {
                    ctx.fillStyle = colorString(bgs[k]!);
                    ctx.fillRect(Math.round(x), y, Math.ceil(widths[i]!), ch);
                }
                ctx.font = fontOf(weight[k]!);
                ctx.fillStyle = fgs[k] ? colorString(fgs[k]!) : fg;
                ctx.fillText(getChar(frame, k), ox, y);

                ox += widths[i]!;
            }
        }

        // (Default) block mode
    } else {
        let font = '';
        for (let j = 0; j < r; j++) {
            // Column where the next cell is drawn: wide glyphs take two, pushing the
            // rest of the row right (and the last cells off it), like the text renderer.
            let col = 0;
            for (let i = 0; i < c && col < c; i++) {
                const k = j * c + i;
                const x = col * cw;
                const y = j * ch;
                const cp = chars[k]!;
                const empty = cp === 32 || cp === 0;
                let char = '';
                let span = 1;
                if (!empty) {
                    // Parsing a font string is slow; most neighbouring cells share one.
                    const next = fontOf(weight[k]!);
                    if (next !== font) ctx.font = font = next;
                    char = getChar(frame, k);
                    if (cp >= 0x1100) span = cellSpan(ctx, font, char, cw);
                }
                col += span;
                if (bgs[k] && bgs[k] !== bgPacked) {
                    ctx.fillStyle = colorString(bgs[k]!);
                    ctx.fillRect(Math.round(x), y, Math.ceil(cw * span), ch);
                }
                if (empty) continue;
                ctx.fillStyle = fgs[k] ? colorString(fgs[k]!) : fg;
                ctx.fillText(char, x, y);
            }
        }
    }
    ctx.restore();
}
