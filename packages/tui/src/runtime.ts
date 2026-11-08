/**
@module   runtime
@desc     what the tui needs from the JavaScript runtime, one implementation per runtime
@category tui
*/

export interface Runtime {
    // Terminal columns a grapheme takes: 0, 1 or 2
    stringWidth(s: string): number;
}

// Wide East Asian ranges (Unicode East_Asian_Width W and F).
// shortcut: the main blocks only, not the full EastAsianWidth.txt table; add ranges if a script shows misaligned.
const WIDE = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏ꥠ-꥿가-힣豈-﫿︐-︙︰-﹯＀-｠￠-￦\u{1f300}-\u{1f64f}\u{1f900}-\u{1f9ff}\u{20000}-\u{3fffd}]/u;
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️|\p{Regional_Indicator}{2}/u;
const ZERO = /^[\p{M}\p{Cc}\p{Cf}]/u; // combining marks, controls and format characters alone

// Plain JavaScript, for runtimes without a native width function (Node has one only internally).
export function stringWidth(s: string): number {
    if (ZERO.test(s)) return 0;
    return EMOJI.test(s) || WIDE.test(s) ? 2 : 1;
}

const bun: Runtime = { stringWidth: (s) => Bun.stringWidth(s) };
const node: Runtime = { stringWidth };
// Deno: add `const deno: Runtime` and pick it with `'Deno' in globalThis`.

export const runtime: Runtime = typeof Bun !== 'undefined' ? bun : node;
