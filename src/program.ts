// The contract between run() and a program: what a program exports and what
// it receives each frame.
import type { Frame } from "./core/frame";
import type { Buffer, Cell } from "./modules/buffer";
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

// What main() may return: a glyph (short for out.char = …), a cell object
// (the play.core form), or nothing (use what was written into `out`).
export type CellValue = string | number | Partial<Cell> | null | undefined | void;

// userData: whatever object was passed to run() ({} by default).
// Method syntax on purpose: TypeScript checks method parameters bivariantly, so
// a program may declare narrower ones (buffer: Buffer, data: MyData).
export type Program = {
  boot?(context: Context, buffer: Buffer | Frame, userData: object): void; // the frame for frame() programs, else a buffer view of it
  pre?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
  // Called for every cell; writes the cell into `out` (or returns it).
  main?(position: Coord, context: Context, cursor: Cursor, out: CellOut, userData: object): CellValue;
  post?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
  // Fast API: fills the whole frame (typed arrays) in one call. When present,
  // pre(), main() and post() are not called; boot() and events get the frame.
  frame?(context: Context, cursor: Cursor, frame: Frame, userData: object): void;
  pointerMove?(context: Context, cursor: Cursor, buffer: Buffer | Frame, userData: object): void;
  pointerDown?(context: Context, cursor: Cursor, buffer: Buffer | Frame, userData: object): void;
  pointerUp?(context: Context, cursor: Cursor, buffer: Buffer | Frame, userData: object): void;
  settings?: Partial<Settings>;
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
