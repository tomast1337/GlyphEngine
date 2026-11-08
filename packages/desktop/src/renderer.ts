/**
@module   renderer
@desc     draws frames into an SDL window: glyph atlas texture + one SDL_RenderGeometry per frame
@category desktop
*/

import { type Pointer, ptr as addressOf, toArrayBuffer } from 'bun:ffi';

import { cssColor, type Frame, getChar, type Settings, weightCode } from '@glyph-engine/core';

import { sdl, SDL_BLENDMODE_BLEND, SDL_PIXELFORMAT_ARGB8888, SDL_SCALEMODE_NEAREST, SDL_TEXTUREACCESS_STATIC, sdlError, surfaceInfo, TTF_STYLE_BOLD, TTF_STYLE_NORMAL } from './sdl';

const ATLAS = 2048; // atlas texture size in pixels
const FLOATS = 8; // per SDL_Vertex: x, y, r, g, b, a, u, v

type Glyph = { slot: number; wide: boolean; colored: boolean };

export class Renderer {
    #glyphs = new Map<string, Glyph>(); // weight code + char -> slot
    #next = 1; // slot 0: solid white, for backgrounds
    #perRow: number;
    #capacity: number;
    #slotW: number;
    #texture: Pointer;
    #vertices = new Float32Array(0);
    #indices = new Int32Array(0);
    #rect = new Int32Array(4);
    #encoder = new TextEncoder();

    constructor(
        readonly renderer: Pointer,
        readonly font: Pointer,
        readonly cellW: number,
        readonly cellH: number,
    ) {
        const s = sdl();
        this.#slotW = Math.ceil(cellW * 2); // two cells wide, for wide glyphs
        this.#perRow = Math.floor(ATLAS / this.#slotW);
        this.#capacity = this.#perRow * Math.floor(ATLAS / cellH);
        const texture = s.SDL_CreateTexture(renderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STATIC, ATLAS, ATLAS);
        if (!texture) throw sdlError('SDL_CreateTexture');
        this.#texture = texture;
        s.SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_BLEND);
        s.SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST);
        // Slot 0: a white block; backgrounds sample its middle texel
        const white = new Uint32Array(4 * 4).fill(0xffffffff);
        this.#upload(0, 0, 4, 4, addressOf(white), 16);
    }

    // Draws `frame` (shown by present()); cells with colour 0 use the settings colours (browser defaults when unset).
    draw(frame: Frame, settings: Partial<Settings>) {
        const s = sdl();
        const { cols, rows, fg, bg, weight } = frame;
        const dFg = (settings.color && cssColor(settings.color)) || 0x000000ff;
        const dBg = (settings.backgroundColor && cssColor(settings.backgroundColor)) || 0xffffffff;
        const dWeight = weightCode(settings.fontWeight);
        const quads = cols * rows * 2;
        if (this.#vertices.length < quads * 4 * FLOATS) this.#grow(quads);
        const v = this.#vertices;
        const { cellW, cellH } = this;
        const white = 2 / ATLAS; // middle of the white block
        let n = 0; // floats written

        const quad = (x0: number, y0: number, x1: number, y1: number, c: number, u0: number, v0: number, u1: number, v1: number) => {
            const r = (c >>> 24) / 255;
            const g = ((c >>> 16) & 255) / 255;
            const b = ((c >>> 8) & 255) / 255;
            const a = (c & 255) / 255;
            for (let i = 0; i < 4; i++) {
                const right = i & 1;
                const bottom = i >> 1;
                v[n++] = right ? x1 : x0;
                v[n++] = bottom ? y1 : y0;
                v[n++] = r;
                v[n++] = g;
                v[n++] = b;
                v[n++] = a;
                v[n++] = right ? u1 : u0;
                v[n++] = bottom ? v1 : v0;
            }
        };

        for (let y = 0; y < rows; y++) {
            // Wide glyphs take two columns and push the rest of the row right, like the other renderers
            let col = 0;
            for (let i = 0, k = y * cols; i < cols && col < cols; i++, k++) {
                const char = getChar(frame, k);
                const glyph = char && char !== ' ' ? this.#glyph(char, weight[k] || dWeight) : undefined;
                const span = glyph?.wide && col + 1 < cols ? 2 : 1;
                const x0 = col * cellW;
                const y0 = y * cellH;
                quad(x0, y0, x0 + span * cellW, y0 + cellH, bg[k] || dBg, white, white, white, white);
                if (glyph) {
                    const gx = (glyph.slot % this.#perRow) * this.#slotW;
                    const gy = Math.floor(glyph.slot / this.#perRow) * cellH;
                    const w = this.#slotW;
                    quad(x0, y0, x0 + w, y0 + cellH, glyph.colored ? 0xffffffff : fg[k] || dFg, gx / ATLAS, gy / ATLAS, (gx + w) / ATLAS, (gy + cellH) / ATLAS);
                }
                col += span;
            }
        }

        const r = dBg >>> 24;
        s.SDL_SetRenderDrawColor(this.renderer, r, (dBg >>> 16) & 255, (dBg >>> 8) & 255, 255);
        s.SDL_RenderClear(this.renderer);
        const count = n / FLOATS;
        if (count && !s.SDL_RenderGeometry(this.renderer, this.#texture, addressOf(v), count, addressOf(this.#indices), (count / 4) * 6)) throw sdlError('SDL_RenderGeometry');
    }

    present() {
        sdl().SDL_RenderPresent(this.renderer);
    }

    destroy() {
        sdl().SDL_DestroyTexture(this.#texture);
    }

    #grow(quads: number) {
        this.#vertices = new Float32Array(quads * 4 * FLOATS);
        this.#indices = new Int32Array(quads * 6);
        for (let q = 0; q < quads; q++)
            this.#indices.set(
                [0, 1, 2, 2, 1, 3].map((i) => i + q * 4),
                q * 6,
            );
    }

    #glyph(char: string, weight: number): Glyph {
        const key = weight + char;
        let glyph = this.#glyphs.get(key);
        if (glyph) return glyph;
        // shortcut: when the atlas is full, start over; add eviction if programs show that many glyphs
        if (this.#next >= this.#capacity) {
            this.#glyphs.clear();
            this.#next = 1;
        }
        const s = sdl();
        const slot = this.#next++;
        const text = this.#encoder.encode(char);
        if (weight >= 6) s.TTF_SetFontStyle(this.font, TTF_STYLE_BOLD);
        let surface = s.TTF_RenderText_Blended(this.font, addressOf(text), text.length, 0xffffffff);
        if (weight >= 6) s.TTF_SetFontStyle(this.font, TTF_STYLE_NORMAL);
        glyph = { slot, wide: false, colored: false };
        if (surface) {
            if (surfaceInfo(surface).format !== SDL_PIXELFORMAT_ARGB8888) {
                const converted = s.SDL_ConvertSurface(surface, SDL_PIXELFORMAT_ARGB8888);
                s.SDL_DestroySurface(surface);
                surface = converted;
            }
        }
        if (surface) {
            const { w, h, pitch, pixels } = surfaceInfo(surface);
            glyph.wide = w > this.cellW * 1.5;
            glyph.colored = isColored(new Uint8Array(toArrayBuffer(pixels, 0, pitch * h)), w, h, pitch);
            this.#upload((slot % this.#perRow) * this.#slotW, Math.floor(slot / this.#perRow) * this.cellH, Math.min(w, this.#slotW), Math.min(h, this.cellH), pixels, pitch);
            s.SDL_DestroySurface(surface);
        }
        this.#glyphs.set(key, glyph);
        return glyph;
    }

    #upload(x: number, y: number, w: number, h: number, pixels: Pointer, pitch: number) {
        this.#rect.set([x, y, w, h]);
        if (!sdl().SDL_UpdateTexture(this.#texture, addressOf(this.#rect), pixels, pitch)) throw sdlError('SDL_UpdateTexture');
    }
}

// Glyphs render white; emoji bring their own colours (ARGB8888 is B, G, R, A in memory).
function isColored(px: Uint8Array, w: number, h: number, pitch: number) {
    for (let y = 0; y < h; y++) {
        for (let x = 0, o = y * pitch; x < w; x++, o += 4) {
            if (px[o + 3]! > 0 && (px[o] !== px[o + 1] || px[o + 1] !== px[o + 2])) return true;
        }
    }
    return false;
}
