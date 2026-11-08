// The contract between run() and a program: what a program exports and what
// it receives each frame.
import type { Buffer } from './modules/buffer';
import type { Vec2 } from './modules/vec2';
import type { CellOut } from './out';

export interface Settings {
    element: unknown; // the host's output target: an HTMLElement on the web
    cols: number;
    rows: number;
    once: boolean;
    fps: number;
    renderer: string;
    allowSelect: boolean;
    restoreState: boolean;
    // CSS applied to the element (see CSSStyles in run.ts)
    backgroundColor?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    letterSpacing?: string;
    lineHeight?: string;
    textAlign?: string;
    // Canvas and WebGL renderers only
    canvasOffset?: { x: number | 'auto'; y: number | 'auto' };
    canvasSize?: { width: number; height: number };
}

export interface State {
    time: number;
    frame: number;
    cycle: number;

    fps: number;
}

export interface Metrics {
    aspect: number;
    cellWidth: number;
    lineHeight: number;
    fontFamily: string;
    fontSize: number;
    _update: () => void;
}

// userData: whatever object was passed to run() ({} by default).
// Method syntax on purpose: TypeScript checks method parameters bivariantly, so
// a program may declare narrower ones (buffer: Buffer, data: MyData).
export type Program = {
    boot?(context: Context, buffer: Buffer, userData: object): void;
    pre?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
    // Called for every cell; writes the cell into `out`.
    main?(position: Coord, context: Context, cursor: Cursor, out: CellOut, userData: object): void;
    post?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
    pointerMove?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
    pointerDown?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
    pointerUp?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
    // A key press (and key repeat), sent after the frame like the pointer events.
    keyDown?(context: Context, cursor: Cursor, buffer: Buffer, key: Key, userData: object): void;
    settings?: Partial<Settings>;
    // main() as WGSL, run on the GPU by the "webgpu" renderer (see docs/programs.md).
    // A JS main() is the fallback where WebGPU is unavailable.
    wgsl?: string;
    // Every glyph the WGSL main() may draw; glyph(i) returns the i-th one.
    glyphs?: string;
};

export interface Pointer {
    x: number;
    y: number;
    pressed: boolean;
    px: number;
    py: number;
    ppressed: boolean;
}

// A key press, with browser KeyboardEvent.key names ('a', 'A', 'Enter', 'ArrowUp'...) in every runner.
// The key as typed with the keyboard layout; modifier keys alone are not sent.
export interface Key {
    key: string;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
}

export type Context = {
    height: number;
    width: number;
    frame: number;
    time: number;
    // Milliseconds since the previous frame (0 on the first). Multiply speeds by
    // it so animations run at the same pace whatever the frame rate.
    delta: number;
    cols: number;
    rows: number;
    metrics: Metrics;
    settings: Settings;
    runtime: State;
};

export type Coord = Vec2 & {
    index: number;
};

export type Cursor = {
    pressed: boolean;
    x: number;
    y: number;
};
