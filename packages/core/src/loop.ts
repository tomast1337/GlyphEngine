/**
@module   loop
@desc     the frame loop every runner shares; a Host supplies the platform
@category core
*/

import { bufferOf, computeFrame } from './computeframe';
import FPS from './fps';
import { createFrame, type Frame } from './frame';
import type { Context, Cursor, Key, Metrics, Pointer, Program, Settings, State } from './program';

export type PointerEventName = 'pointerMove' | 'pointerDown' | 'pointerUp';

// What a runner provides: a clock, the output size, input and the drawing.
export type Host = {
    // Calls back on the next frame with a timestamp in ms (like requestAnimationFrame).
    requestFrame(cb: (t: number) => void): void;
    metrics: Metrics;
    // Output size in pixels; cols / rows follow from the metrics unless settings fix them.
    size(): { width: number; height: number };
    pointer: Pointer; // in pixels, updated by the host
    events: PointerEventName[]; // queued by the host, sent to the program after each frame
    keys?: Key[]; // the same for key presses
    render(context: Context, frame: Frame, cursor: Cursor): void;
    // main() runs elsewhere (WGSL on the GPU): the frame only gets pre() / post()
    onGpu?: boolean;
    // Called at most once per second with the state, for settings.restoreState
    storeState?(state: State): void;
};

// Boots the program and runs it every frame. `state` may hold a restored time /
// frame count. onFirstFrame runs when the first frame got through without errors.
export function startLoop(program: Program, settings: Settings, userData: object, state: State, host: Host, onFirstFrame: (context: Context) => void) {
    const fps = new FPS();
    const { metrics, pointer } = host;

    let context = getContext(state, settings, metrics, fps, host.size());
    // Programs get a sized frame already in boot()
    let cols = context.cols;
    let rows = context.rows;
    let frame: Frame = createFrame(cols, rows);
    if (typeof program.boot == 'function') program.boot(context, bufferOf(frame), userData);

    // Time sample to calculate precise offset
    let timeSample = 0;
    const interval = 1000 / settings.fps;
    const timeOffset = state.time;
    // Timestamp of the last frame that ran, for context.delta
    let lastFrameT: number | undefined;
    let lastStore = -Infinity;
    let first = true;

    function loop(t: number) {
        // Timing
        const delta = t - timeSample;
        if (delta < interval) {
            // Too early: wait for the next tick (also with once, or the one frame never runs)
            host.requestFrame(loop);
            return;
        }

        // Snapshot of context data
        context = getContext(state, settings, metrics, fps, host.size(), lastFrameT === undefined ? 0 : t - lastFrameT);
        lastFrameT = t;
        fps.update(t);

        // Timing update
        timeSample = t - (delta % interval); // adjust timeSample
        state.time = t + timeOffset; // increment time + initial offs
        state.frame++;
        if (host.storeState && settings.restoreState && t - lastStore >= 1000) {
            host.storeState(state);
            lastStore = t;
        }

        const cursor = {
            // The output might be slightly larger than the number of cols/rows, min is required!
            x: Math.min(context.cols - 1, pointer.x / metrics.cellWidth),
            y: Math.min(context.rows - 1, pointer.y / metrics.lineHeight),
            pressed: pointer.pressed,
            p: {
                // state of previous frame
                x: pointer.px / metrics.cellWidth,
                y: pointer.py / metrics.lineHeight,
                pressed: pointer.ppressed,
            },
        };
        pointer.px = pointer.x;
        pointer.py = pointer.y;
        pointer.ppressed = pointer.pressed;

        // In case of resize: a fresh, empty frame
        if (cols != context.cols || rows != context.rows) {
            cols = context.cols;
            rows = context.rows;
            frame = createFrame(cols, rows);
        }

        computeFrame(program, context, cursor, frame, userData, host.onGpu);
        host.render(context, frame, cursor);

        // Queued events
        while (host.events.length > 0) {
            const type = host.events.shift();
            if (type && typeof program[type] == 'function') program[type](context, cursor, bufferOf(frame), userData);
        }
        while (host.keys?.length) {
            const key = host.keys.shift()!;
            if (typeof program.keyDown == 'function') program.keyDown(context, cursor, bufferOf(frame), key, userData);
        }

        if (!settings.once) host.requestFrame(loop);
        if (first) {
            first = false;
            onFirstFrame(context);
        }
    }
    host.requestFrame(loop);
}

// Build / update the 'context' object (immutable)
function getContext(state: State, settings: Settings, metrics: Metrics, fps: FPS, size: { width: number; height: number }, delta = 0): Context {
    return Object.freeze({
        frame: state.frame,
        time: state.time,
        delta,
        cols: settings.cols || Math.floor(size.width / metrics.cellWidth),
        rows: settings.rows || Math.floor(size.height / metrics.lineHeight),
        metrics,
        width: size.width,
        height: size.height,
        settings,
        // Runtime & debug data
        runtime: Object.freeze({ cycle: state.cycle, fps: fps.fps }),
    }) as Context;
}
