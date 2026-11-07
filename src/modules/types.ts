import type { Frame } from "../core/frame";
import { type RenderModes } from "../core/types";
import { type Vec2 } from "./vec2";

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

// What main() may return for a cell: a glyph, a cell, or nothing (a space).
export type CellValue = string | number | Partial<Cell> | null | undefined | void;

// userData: whatever object was passed to run() ({} by default).
// Method syntax on purpose: TypeScript checks method parameters bivariantly, so
// a program may declare narrower ones (buffer: Buffer, data: MyData).
export type Program = {
  boot?(context: Context, buffer: Buffer | Frame, userData: object): void; // Frame for frame() programs
  pre?(context: Context, cursor: Cursor, buffer: Buffer, userData: object): void;
  main?(position: Coord, context: Context, cursor: Cursor, buffer: Buffer, userData: object): CellValue;
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

export type Cell = {
      char: string;
      beginHTML?: string; // text renderer only: raw HTML around the glyph
      endHTML?: string;
      color?: string;
      backgroundColor?: string;
      fontWeight?: string;
      shadowStyle?: string;
      borderStyle?: string;
      shadowX?: number;
      shadowY?: number;
    };
// Extra: fields a program keeps in its own cells, e.g. Buffer<{ value: number }>
export type Buffer<Extra extends object = object> = Array<Cell & Extra>;
export interface Style {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  paddingX?: number;
  paddingY?: number;
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  shadowStyle?: string;
  borderStyle?: string;
  shadowX?: number;
  shadowY?: number;
}

export type Context = {
  height: number;
  width: number;
  frame: number;
  time: number;
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

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };
