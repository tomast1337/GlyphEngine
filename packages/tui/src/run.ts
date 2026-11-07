/**
Runs a program in the terminal: alternate screen, 24-bit colour, mouse as the cursor.
Ctrl+C quits.
*/

import { type Context, type Host, type Pointer, type PointerEventName, type Program, type Settings, startLoop, type State } from '@glyph-engine/core';

import { createRenderer } from './renderer';

const ESC = '\x1b[';
// Alternate screen, hidden cursor, mouse reports on any motion (SGR encoding)
const ENTER = ESC + '?1049h' + ESC + '?25l' + ESC + '?1003h' + ESC + '?1006h';
const LEAVE = ESC + '?1003l' + ESC + '?1006l' + ESC + '0m' + ESC + '?25h' + ESC + '?1049l';
const MOUSE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;

// shortcut: cells assumed twice as tall as wide (aspect 0.5); query the terminal
// (CSI 14t) if programs look squashed in some terminal.
const CELL_W = 8;
const CELL_H = 16;

const defaultSettings = {
    element: null,
    cols: 0, // 0: the terminal's width
    rows: 0, // 0: the terminal's height
    once: false,
    fps: 30,
    renderer: 'tui',
    allowSelect: false,
    restoreState: false,
} as Settings;

export function run(program: Program, runSettings: Partial<Settings> = {}, userData: object = {}): Promise<Context> {
    return new Promise((resolve, reject) => {
        const settings: Settings = { ...defaultSettings, ...runSettings, ...program.settings };
        const stdout = process.stdout;
        const stdin = process.stdin;
        const state: State = { time: 0, frame: 0, cycle: 0, fps: settings.fps };
        const pointer: Pointer = { x: 0, y: 0, pressed: false, px: 0, py: 0, ppressed: false };
        const events: PointerEventName[] = [];
        const draw = createRenderer((s) => stdout.write(s));
        let started = false;

        let restored = false;
        const restore = () => {
            if (restored) return;
            restored = true;
            stdout.write(LEAVE);
            if (stdin.isTTY) stdin.setRawMode(false);
            stdin.pause();
        };
        // Terminal back to normal before any error is printed, or it vanishes with the alternate screen
        const fail = (e: unknown) => {
            restore();
            if (!started) reject(e);
            else throw e;
        };
        process.on('exit', restore);

        stdout.write(ENTER);
        if (stdin.isTTY) stdin.setRawMode(true);
        stdin.setEncoding('utf8');
        stdin.on('data', (data: string) => {
            if (data.includes('\x03')) {
                restore();
                process.exit(0); // Ctrl+C: the normal way to quit
            }
            for (const [, b, x, y, kind] of data.matchAll(MOUSE)) {
                const button = Number(b);
                if (button & 64) continue; // wheel
                pointer.x = (Number(x) - 0.5) * CELL_W; // reports are 1-based; aim at the cell's centre
                pointer.y = (Number(y) - 0.5) * CELL_H;
                if (button & 32) {
                    events.push('pointerMove');
                } else {
                    pointer.pressed = kind == 'M';
                    events.push(pointer.pressed ? 'pointerDown' : 'pointerUp');
                }
            }
        });

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
            metrics: { aspect: CELL_W / CELL_H, cellWidth: CELL_W, lineHeight: CELL_H, fontFamily: 'monospace', fontSize: CELL_H, _update: () => {} },
            size: () => ({ width: (stdout.columns || 80) * CELL_W, height: (stdout.rows || 24) * CELL_H }),
            pointer,
            events,
            render: (_context, frame) => draw(frame, settings),
        };
        try {
            startLoop(program, settings, userData, state, host, (context) => {
                started = true;
                resolve(context);
            });
        } catch (e) {
            fail(e);
        }
    });
}
