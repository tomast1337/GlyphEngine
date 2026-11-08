/**
Runs a program in a native window through SDL3 (bun:ffi, no npm dependencies).
settings.renderer picks SDL's backend: "vulkan", "opengl", "opengles2", "gpu" or
"software"; anything else lets SDL choose. Closing the window or Escape quits.
*/

import { CString, type Pointer, ptr as addressOf } from 'bun:ffi';

import { type Context, type Frame, type Host, type Pointer as PointerState, type PointerEventName, type Program, type Settings, startLoop, type State } from '@glyph-engine/core';

import { Renderer } from './renderer';
import { renderDrivers, sdl, SDL_EVENT_KEY_DOWN, SDL_EVENT_MOUSE_BUTTON_DOWN, SDL_EVENT_MOUSE_BUTTON_UP, SDL_EVENT_MOUSE_MOTION, SDL_EVENT_QUIT, SDL_EVENT_WINDOW_EXPOSED, SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED, SDL_EVENT_WINDOW_RESIZED, SDL_INIT_VIDEO, SDL_WINDOW_HIGH_PIXEL_DENSITY, SDL_WINDOW_RESIZABLE, sdlError, SDLK_ESCAPE } from './sdl';

const defaultSettings = {
    element: null,
    cols: 0, // 0: as many as fit the window
    rows: 0,
    once: false,
    fps: 30,
    renderer: '', // an SDL render driver; empty: SDL's choice
    allowSelect: false,
    restoreState: false,
    fontFamily: 'monospace',
    fontSize: '16px',
} as Settings;

// The font file for a family name, through fontconfig. CSS lists ('"A", monospace') use the first name.
function fontFile(family: string): string {
    const first =
        family
            .split(',')[0]!
            .trim()
            .replace(/^["']|["']$/g, '') || 'monospace';
    const found = Bun.spawnSync(['fc-match', '-f', '%{file}', first]);
    if (!found.success || !found.stdout.length) throw new Error(`No font file for "${first}" (fontconfig's fc-match is needed)`);
    return found.stdout.toString();
}

function emojiFile(): string | undefined {
    const found = Bun.spawnSync(['fc-match', '-f', '%{file}', 'emoji']);
    return found.success && found.stdout.length ? found.stdout.toString() : undefined;
}

// The settings.renderer to ask SDL for: the run() setting wins over the program's (programs
// name web renderers), and only SDL driver names count.
function driverFor(runSettings: Partial<Settings>, settings: Settings): string | null {
    const drivers = renderDrivers();
    for (const name of [runSettings.renderer, settings.renderer]) if (name && drivers.includes(name)) return name;
    return null;
}

export function run(program: Program, runSettings: Partial<Settings> = {}, userData: object = {}): Promise<Context> {
    return new Promise((resolve, reject) => {
        const settings: Settings = { ...defaultSettings, ...runSettings, ...program.settings };
        const s = sdl();
        const ints = new Int32Array(2);
        const event = new Uint8Array(128); // SDL_Event is a 128-byte union
        const view = new DataView(event.buffer);
        let window: Pointer | null = null;
        let gpu: Pointer | null = null;
        let renderer: Renderer | undefined;
        let font: Pointer | null = null;
        let started = false;
        let last: Frame | undefined; // the frame on screen, drawn again when the window needs it
        let polling: Timer | undefined;

        const close = () => {
            clearInterval(polling);
            renderer?.destroy();
            renderer = undefined;
            if (gpu) s.SDL_DestroyRenderer(gpu);
            if (window) s.SDL_DestroyWindow(window);
            gpu = window = null;
            s.SDL_Quit();
        };
        const fail = (e: unknown) => {
            close();
            if (!started) reject(e);
            else throw e;
        };

        try {
            if (!s.SDL_Init(SDL_INIT_VIDEO)) throw sdlError('SDL_Init');
            if (!s.TTF_Init()) throw sdlError('TTF_Init');
            window = s.SDL_CreateWindow(Buffer.from('GlyphEngine\0'), 960, 600, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
            if (!window) throw sdlError('SDL_CreateWindow');
            const driver = driverFor(runSettings, settings);
            gpu = s.SDL_CreateRenderer(window, driver ? Buffer.from(driver + '\0') : null);
            if (!gpu) throw sdlError(`SDL_CreateRenderer (${driver ?? 'default'})`);
            settings.renderer = String(new CString(s.SDL_GetRendererName(gpu)!)); // what SDL actually uses

            // Font size in window pixels: CSS pixels times the display's pixel density
            const density = s.SDL_GetWindowPixelDensity(window) || 1;
            font = s.TTF_OpenFont(Buffer.from(fontFile(settings.fontFamily ?? 'monospace') + '\0'), (parseFloat(settings.fontSize ?? '16') || 16) * density);
            if (!font) throw sdlError('TTF_OpenFont');
            const emoji = emojiFile();
            const emojiFont = emoji && s.TTF_OpenFont(Buffer.from(emoji + '\0'), (parseFloat(settings.fontSize ?? '16') || 16) * density);
            if (emojiFont) s.TTF_AddFallbackFont(font, emojiFont);
            const x = Buffer.from('X');
            s.TTF_GetStringSize(font, addressOf(x), 1, addressOf(ints), addressOf(ints, 4));
            const cellW = ints[0]!;
            const cellH = s.TTF_GetFontHeight(font);
            renderer = new Renderer(gpu, font, cellW, cellH);

            const state: State = { time: 0, frame: 0, cycle: 0, fps: settings.fps };
            const pointer: PointerState = { x: 0, y: 0, pressed: false, px: 0, py: 0, ppressed: false };
            const events: PointerEventName[] = [];

            // Window events, polled on their own timer so the window keeps answering after a once frame
            const poll = () => {
                while (s.SDL_PollEvent(addressOf(event))) {
                    const type = view.getUint32(0, true);
                    if (type === SDL_EVENT_QUIT || (type === SDL_EVENT_KEY_DOWN && view.getUint32(28, true) === SDLK_ESCAPE)) {
                        close();
                        process.exit(0);
                    } else if (type === SDL_EVENT_WINDOW_EXPOSED || type === SDL_EVENT_WINDOW_RESIZED || type === SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                        if (last) {
                            renderer!.draw(last, settings);
                            renderer!.present();
                        }
                    } else if (type === SDL_EVENT_MOUSE_MOTION || type === SDL_EVENT_MOUSE_BUTTON_DOWN || type === SDL_EVENT_MOUSE_BUTTON_UP) {
                        // Window coordinates; the grid is in pixels
                        pointer.x = view.getFloat32(28, true) * density;
                        pointer.y = view.getFloat32(32, true) * density;
                        if (type === SDL_EVENT_MOUSE_MOTION) {
                            events.push('pointerMove');
                        } else {
                            pointer.pressed = type === SDL_EVENT_MOUSE_BUTTON_DOWN;
                            events.push(pointer.pressed ? 'pointerDown' : 'pointerUp');
                        }
                    }
                }
            };

            const host: Host = {
                // Polls often enough for the loop's fps cap to stay accurate.
                requestFrame: (cb) =>
                    setTimeout(() => {
                        try {
                            cb(performance.now());
                        } catch (e) {
                            fail(e);
                        }
                    }, 4),
                metrics: { aspect: cellW / cellH, cellWidth: cellW, lineHeight: cellH, fontFamily: settings.fontFamily ?? 'monospace', fontSize: cellH, _update: () => {} },
                size: () => {
                    s.SDL_GetWindowSizeInPixels(window, addressOf(ints), addressOf(ints, 4));
                    return { width: ints[0]!, height: ints[1]! };
                },
                pointer,
                events,
                render: (_context, frame) => {
                    last = frame;
                    renderer!.draw(frame, settings);
                    renderer!.present();
                },
            };
            polling = setInterval(() => {
                try {
                    poll();
                } catch (e) {
                    fail(e);
                }
            }, 4);
            startLoop(program, settings, userData, state, host, (context) => {
                started = true;
                resolve(context);
            });
        } catch (e) {
            fail(e);
        }
    });
}
