/**
@module   textrenderer
@desc     renders to a text element
@category renderer
*/

import type { Context } from '@glyph-engine/core';
import { colorString, createFrame, type Frame, getChar, GRAPHEME, weightString } from '@glyph-engine/core';

import type { Render } from './renderer';

export default {
    preferredElementNodeName: 'PRE',
    render,
} as Render;

const ESCAPED: Record<number, string> = { 38: '&amp;', 60: '&lt;', 62: '&gt;' };
// Multi-code-point glyphs are stored whole, so any of them may hold markup.
const escape = (s: string) => s.replace(/[&<>]/g, (m) => ESCAPED[m.charCodeAt(0)]!);

// Per element, so several text-rendered programs on one page don't share state.
// `back` is a copy of the last rendered frame, to skip unchanged rows.
const states = new WeakMap<HTMLElement, { back: Frame | null }>();

function render(context: Context, frame: Frame) {
    const element = context.settings.element as HTMLElement;
    let state = states.get(element);
    if (!state) states.set(element, (state = { back: null }));

    const { cols, rows } = frame;
    // Detect resize: a fresh back frame makes every row differ on the first pass
    let back = state.back;
    if (!back || back.cols !== cols || back.rows !== rows) {
        back = state.back = createFrame(cols, rows);
        back.chars.fill(0xffffffff);
    }

    // DOM rows update: expand lines if necessary
    // TODO: also benchmark a complete 'innerHTML' rewrite, could be faster?
    while (element.childElementCount < rows) {
        const span = document.createElement('span');
        span.style.display = 'block';
        element.appendChild(span);
    }

    // DOM rows update: shorten lines if necessary
    // https://jsperf.com/innerhtml-vs-removechild/15
    while (element.childElementCount > rows) {
        element.removeChild(element.lastChild as Node);
    }

    const { chars, fg, bg, weight, html } = frame;
    const fontWeight = context.settings.fontWeight;

    // A bit of a cumbersome render-loop…
    // A few notes: the fastest way I found to render the image
    // is by manually write the markup into the parent node via .innerHTML;
    // creating a node via .createElement and then popluate it resulted
    // remarkably slower (even if more elegant for the CSS handling below).
    for (let j = 0; j < rows; j++) {
        const start = j * cols;
        const end = start + cols;

        // Comparing numbers is faster than updating the DOM.
        // shortcut: rows are always rebuilt while any cell carries beginHTML /
        // endHTML (an undocumented legacy feature), instead of tracking them.
        let changed = html.size > 0;
        for (let k = start; k < end && !changed; k++) {
            changed = chars[k] !== back.chars[k] || fg[k] !== back.fg[k] || bg[k] !== back.bg[k] || weight[k] !== back.weight[k];
        }
        if (!changed) continue;
        back.chars.set(chars.subarray(start, end), start);
        back.fg.set(fg.subarray(start, end), start);
        back.bg.set(bg.subarray(start, end), start);
        back.weight.set(weight.subarray(start, end), start);

        let markup = ''; // Accumulates the markup
        let tagIsOpen = false;
        let pf = 0,
            pb = 0,
            pw = 0; // current style; all 0 (defaults) needs no span
        for (let k = start; k < end; k++) {
            // Undocumented feature:
            // possible to inject some custom HTML (for example <a>) into the renderer.
            // It can be inserted before the char or after the char (beginHTML, endHTML)
            // and this is a very hack…
            const extra = html.size > 0 ? html.get(k) : undefined;
            if (extra?.begin) {
                if (tagIsOpen) {
                    markup += '</span>';
                    pf = pb = pw = 0;
                    tagIsOpen = false;
                }
                markup += extra.begin;
            }

            // If there is a change in style a new span has to be inserted
            const f = fg[k]!,
                b = bg[k]!,
                w = weight[k]!;
            if (f !== pf || b !== pb || w !== pw) {
                // Close the previous tag
                if (tagIsOpen) markup += '</span>';
                // Accumulate the CSS inline attribute (0 = settings default: no CSS).
                let css = '';
                if (f) css += 'color:' + colorString(f) + ';';
                if (b) css += 'background:' + colorString(b) + ';';
                if (w && weightString(w) !== fontWeight) css += 'font-weight:' + weightString(w) + ';';
                if (css) css = ' style="' + css + '"';
                markup += '<span' + css + '>';
                tagIsOpen = true;
                pf = f;
                pb = b;
                pw = w;
            }
            const c = chars[k]!;
            markup += c === 38 || c === 60 || c === 62 ? ESCAPED[c] : c >= GRAPHEME ? escape(getChar(frame, k)) : getChar(frame, k);

            // Add closing tag, in case
            if (extra?.end) {
                if (tagIsOpen) {
                    markup += '</span>';
                    pf = pb = pw = 0;
                    tagIsOpen = false;
                }
                markup += extra.end;
            }
        }
        if (tagIsOpen) markup += '</span>';

        // Write the row
        (element.childNodes[j] as HTMLElement).innerHTML = markup;
    }
}
