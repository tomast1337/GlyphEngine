/**
@module   cellspan
@desc     how many grid cells a glyph covers (1, or 2 for emoji, CJK, ...)
@category internal
*/

// The text renderer lays a row out as text, so a wide glyph pushes the rest of
// the row to the right. The grid renderers use this to do the same.
const cache = new Map<string, number>();

// `font` must be the font set on `ctx` (passed in: reading ctx.font is slow);
// `cellWidth` in the same units as that font size.
export function cellSpan(ctx: CanvasRenderingContext2D, font: string, char: string, cellWidth: number): number {
    // Fast path: single code units below U+1100 are never wide.
    if (char.length < 2 && !(char.charCodeAt(0) >= 0x1100)) return 1;
    const key = font + '|' + cellWidth + '|' + char;
    let span = cache.get(key);
    if (span === undefined) {
        span = ctx.measureText(char).width > cellWidth * 1.5 ? 2 : 1;
        // shortcut: unbounded growth only from programs producing many distinct
        // non-ASCII glyphs; drop everything past this size.
        if (cache.size > 65536) cache.clear();
        cache.set(key, span);
    }
    return span;
}
