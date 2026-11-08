/**
@module   sdl
@desc     the parts of SDL3 and SDL3_ttf the desktop runner uses, through bun:ffi
@category desktop
*/

import { CString, dlopen, FFIType, type Pointer, read } from 'bun:ffi';

const { ptr, i32, u32, u64, f32, bool, cstring, u64_fast } = FFIType;
const size_t = u64_fast;
const REPO = 'https://github.com/tomast1337/GlyphEngine';

// Library file names per platform. SDL3 and SDL3_ttf must be installed.
function libraries(): { sdl: string; ttf: string } {
    switch (process.platform) {
        case 'linux':
            return { sdl: 'libSDL3.so.0', ttf: 'libSDL3_ttf.so.0' };
        case 'darwin':
            // shortcut: not tested; libSDL3.0.dylib / libSDL3_ttf.0.dylib, font lookup without fontconfig
            throw new Error(`The desktop runner does not support macOS yet. Contributions welcome: ${REPO}`);
        case 'win32':
            // shortcut: not tested; SDL3.dll / SDL3_ttf.dll, font lookup without fontconfig
            throw new Error(`The desktop runner does not support Windows yet. Contributions welcome: ${REPO}`);
        default:
            throw new Error(`The desktop runner does not support ${process.platform}. Open an issue: ${REPO}/issues`);
    }
}

function open() {
    const names = libraries();
    try {
        const sdl = dlopen(names.sdl, {
            SDL_Init: { args: [u32], returns: bool },
            SDL_Quit: { returns: FFIType.void },
            SDL_GetError: { returns: ptr },
            SDL_SetHint: { args: [cstring, cstring], returns: bool },
            SDL_CreateWindow: { args: [cstring, i32, i32, u64], returns: ptr },
            SDL_DestroyWindow: { args: [ptr], returns: FFIType.void },
            SDL_GetWindowSizeInPixels: { args: [ptr, ptr, ptr], returns: bool },
            SDL_GetWindowPixelDensity: { args: [ptr], returns: f32 },
            SDL_GetNumRenderDrivers: { returns: i32 },
            SDL_GetRenderDriver: { args: [i32], returns: ptr },
            SDL_CreateRenderer: { args: [ptr, cstring], returns: ptr },
            SDL_DestroyRenderer: { args: [ptr], returns: FFIType.void },
            SDL_GetRendererName: { args: [ptr], returns: ptr },
            SDL_SetRenderDrawColor: { args: [ptr, FFIType.u8, FFIType.u8, FFIType.u8, FFIType.u8], returns: bool },
            SDL_RenderClear: { args: [ptr], returns: bool },
            SDL_RenderGeometry: { args: [ptr, ptr, ptr, i32, ptr, i32], returns: bool },
            SDL_RenderPresent: { args: [ptr], returns: bool },
            SDL_RenderReadPixels: { args: [ptr, ptr], returns: ptr },
            SDL_CreateTexture: { args: [ptr, u32, i32, i32, i32], returns: ptr },
            SDL_DestroyTexture: { args: [ptr], returns: FFIType.void },
            SDL_UpdateTexture: { args: [ptr, ptr, ptr, i32], returns: bool },
            SDL_SetTextureBlendMode: { args: [ptr, u32], returns: bool },
            SDL_SetTextureScaleMode: { args: [ptr, i32], returns: bool },
            SDL_ConvertSurface: { args: [ptr, u32], returns: ptr },
            SDL_DestroySurface: { args: [ptr], returns: FFIType.void },
            SDL_PollEvent: { args: [ptr], returns: bool },
            SDL_GetKeyFromScancode: { args: [u32, FFIType.u16, bool], returns: u32 },
        });
        const ttf = dlopen(names.ttf, {
            TTF_Init: { returns: bool },
            TTF_Quit: { returns: FFIType.void },
            TTF_OpenFont: { args: [cstring, f32], returns: ptr },
            TTF_CloseFont: { args: [ptr], returns: FFIType.void },
            TTF_AddFallbackFont: { args: [ptr, ptr], returns: bool },
            TTF_SetFontStyle: { args: [ptr, u32], returns: FFIType.void },
            TTF_GetFontHeight: { args: [ptr], returns: i32 },
            TTF_GetStringSize: { args: [ptr, ptr, size_t, ptr, ptr], returns: bool },
            // SDL_Color by value: 4 bytes, passed like a u32 (white is the same in any byte order)
            TTF_RenderText_Blended: { args: [ptr, ptr, size_t, u32], returns: ptr },
        });
        return { ...sdl.symbols, ...ttf.symbols };
    } catch (e) {
        throw new Error(`The desktop runner needs SDL3 and SDL3_ttf (${names.sdl}, ${names.ttf}): ${(e as Error).message}`);
    }
}

let lib: ReturnType<typeof open> | undefined;
// Loaded on first use, so importing the package works without SDL installed.
export function sdl() {
    return (lib ??= open());
}

export function sdlError(what: string): Error {
    const p = sdl().SDL_GetError();
    return new Error(`${what}: ${p ? new CString(p) : 'unknown SDL error'}`);
}

export function renderDrivers(): string[] {
    const s = sdl();
    return Array.from({ length: s.SDL_GetNumRenderDrivers() }, (_, i) => String(new CString(s.SDL_GetRenderDriver(i)!)));
}

// SDL_Surface: flags u32, format u32, w i32, h i32, pitch i32, (pad), pixels ptr
export function surfaceInfo(surface: Pointer) {
    return { format: read.u32(surface, 4), w: read.i32(surface, 8), h: read.i32(surface, 12), pitch: read.i32(surface, 16), pixels: read.ptr(surface, 24) as Pointer };
}

export const SDL_INIT_VIDEO = 0x20;
export const SDL_WINDOW_RESIZABLE = 0x20n;
export const SDL_WINDOW_HIGH_PIXEL_DENSITY = 0x2000n;
export const SDL_WINDOW_HIDDEN = 0x8n;
export const SDL_PIXELFORMAT_ARGB8888 = 0x16362004;
export const SDL_TEXTUREACCESS_STATIC = 0;
export const SDL_BLENDMODE_BLEND = 1;
export const SDL_SCALEMODE_NEAREST = 0;
export const SDL_EVENT_QUIT = 0x100;
export const SDL_EVENT_WINDOW_EXPOSED = 0x204;
export const SDL_EVENT_WINDOW_RESIZED = 0x206;
export const SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED = 0x207;
export const SDL_EVENT_KEY_DOWN = 0x300;
export const SDL_EVENT_MOUSE_MOTION = 0x400;
export const SDL_EVENT_MOUSE_BUTTON_DOWN = 0x401;
export const SDL_EVENT_MOUSE_BUTTON_UP = 0x402;
export const SDLK_ESCAPE = 0x1b;
export const TTF_STYLE_NORMAL = 0;
export const TTF_STYLE_BOLD = 1;
