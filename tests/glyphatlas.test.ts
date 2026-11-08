import { expect, test } from 'bun:test';

import { isColorGlyph } from '../packages/web/src/glyphatlas';

const pixels = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

test('white glyphs with read-back noise are not colour glyphs', () => {
    expect(isColorGlyph(pixels([255, 255, 255, 255], [128, 128, 128, 128]))).toBe(false);
    expect(isColorGlyph(pixels([254, 255, 253, 255], [130, 127, 128, 128]))).toBe(false);
});

test('emoji pixels are colour glyphs', () => {
    expect(isColorGlyph(pixels([255, 255, 255, 255], [230, 60, 40, 255]))).toBe(true);
});

test('transparent pixels are ignored', () => {
    expect(isColorGlyph(pixels([200, 0, 0, 0]))).toBe(false);
});
