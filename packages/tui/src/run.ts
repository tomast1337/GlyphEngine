/**
Runs a program in the terminal: alternate screen, 24-bit colour, mouse as the cursor.
Ctrl+C quits. With an Io, over any stream instead (see Io).
*/

import { type Context, type Host, type Key, type Pointer, type PointerEventName, type Program, type Settings, startLoop, type State } from '@glyph-engine/core';

import { parseKeys } from './keys';
import { createRenderer } from './renderer';

const ESC = '\x1b[';
// Alternate screen, hidden cursor, mouse reports on any motion (SGR encoding)
const ENTER = ESC + '?1049h' + ESC + '?25l' + ESC + '?1003h' + ESC + '?1006h';
const LEAVE = ESC + '?1003l' + ESC + '?1006l' + ESC + '0m' + ESC + '?25h' + ESC + '?1049l';
const MOUSE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
// 'exit' doesn't fire when killed by these, so restore on them too; numbers for the 128 + n exit code
const SIGNALS = { SIGHUP: 1, SIGQUIT: 3, SIGTERM: 15 } as const;

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

// Where run() draws and reads. Without it: the local terminal (stdout / stdin).
export type Io = {
    write(s: string): void; // frames and terminal modes go here
    input?: AsyncIterable<string | Uint8Array> | ReadableStream<string | Uint8Array>; // keys and mouse reports come from here
    size?(): { cols: number; rows: number }; // the terminal size; 80x24 without it
    signal?: AbortSignal; // aborting stops the loop and leaves the terminal modes
    ready?(): boolean; // false: the output is backed up, the frame is skipped
    onError?(e: unknown): void; // an error after the first frame (the loop has stopped); without it, thrown
};

/**
Runs `program` in the local terminal, or over `io` (an SSH channel, a socket, a WebSocket...).
With `io` the process is left alone: no raw mode, no exit hook, and Ctrl+C is a key like any other.
*/
export function run(program: Program, runSettings: Partial<Settings> = {}, userData: object = {}, io?: Io): Promise<Context> {
    return new Promise((resolve, reject) => {
        const settings: Settings = { ...defaultSettings, ...runSettings, ...program.settings };
        const stdout = process.stdout;
        const stdin = process.stdin;
        const write = io ? (s: string) => io.write(s) : (s: string) => void stdout.write(s);
        const size = io ? (io.size ?? (() => ({ cols: 80, rows: 24 }))) : () => ({ cols: stdout.columns || 80, rows: stdout.rows || 24 });
        const state: State = { time: 0, frame: 0, cycle: 0, fps: settings.fps };
        const pointer: Pointer = { x: 0, y: 0, pressed: false, px: 0, py: 0, ppressed: false };
        const events: PointerEventName[] = [];
        const keys: Key[] = [];
        let pending = ''; // an escape sequence split across reads
        const draw = createRenderer(write);
        let started = false;

        const read = (data: string) => {
            if (stopped) return;
            if (!io && data.includes('\x03')) {
                stop();
                process.exit(0); // Ctrl+C: the normal way to quit
            }
            const text = pending + data; // pending: a sequence cut off at the end of the last read
            const parsed = parseKeys(text);
            pending = parsed.rest;
            if (program.keyDown) keys.push(...parsed.keys);
            for (const [, b, x, y, kind] of text.matchAll(MOUSE)) {
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
        };

        let stopped = false;
        const stop = () => {
            if (stopped) return;
            stopped = true;
            write(LEAVE);
            if (io) return;
            process.off('exit', stop);
            for (const signal in SIGNALS) process.off(signal, onSignal);
            stdin.off('data', read);
            if (stdin.isTTY) stdin.setRawMode(false);
            stdin.pause();
        };
        const onSignal = (signal: keyof typeof SIGNALS) => {
            stop();
            process.exit(128 + SIGNALS[signal]);
        };
        // Terminal back to normal before any error is printed, or it vanishes with the alternate screen
        const fail = (e: unknown) => {
            stop();
            if (!started) reject(e);
            else if (io?.onError) io.onError(e);
            else throw e;
        };

        if (io?.signal?.aborted) return reject(io.signal.reason);
        io?.signal?.addEventListener('abort', stop, { once: true });
        write(ENTER);
        if (io) {
            if (io.input)
                (async () => {
                    const decoder = new TextDecoder();
                    for await (const chunk of io.input as AsyncIterable<string | Uint8Array>) {
                        // ReadableStream is async iterable in Bun, Node and Deno
                        if (stopped) break;
                        read(typeof chunk == 'string' ? chunk : decoder.decode(chunk, { stream: true }));
                    }
                })().catch(fail);
        } else {
            process.on('exit', stop);
            for (const signal in SIGNALS) process.on(signal, onSignal);
            if (stdin.isTTY) stdin.setRawMode(true);
            stdin.setEncoding('utf8');
            stdin.on('data', read);
        }

        const host: Host = {
            // Polls often enough for the loop's fps cap to stay accurate. Stopping ends the loop here.
            requestFrame: (cb) =>
                void setTimeout(() => {
                    if (stopped) return;
                    try {
                        cb(performance.now());
                    } catch (e) {
                        fail(e);
                    }
                }, 4),
            metrics: { aspect: CELL_W / CELL_H, cellWidth: CELL_W, lineHeight: CELL_H, fontFamily: 'monospace', fontSize: CELL_H, _update: () => {} },
            size: () => {
                const { cols, rows } = size();
                return { width: cols * CELL_W, height: rows * CELL_H };
            },
            pointer,
            events,
            keys,
            render: (_context, frame) => {
                if (!io?.ready || io.ready()) draw(frame, settings);
            },
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
