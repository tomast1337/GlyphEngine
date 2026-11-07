// The contract between run() and a program: what a program exports and what
// it receives each frame.
import type { Buffer } from "./modules/buffer";
import type { RenderModes } from "./core/renderer";
import type { CellOut } from "./core/out";
import type { Vec2 } from "./modules/vec2";

export interface Settings {
  element: HTMLElement | HTMLCanvasElement | null;
  cols: number;
  rows: number;
  once: boolean;
  fps: number;
  renderer: RenderModes;
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
  canvasOffset?: { x: number | "auto"; y: number | "auto" };
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
