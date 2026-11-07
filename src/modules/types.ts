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
  [key: string]: any;
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

export type Program = {
  boot?: (context: Context, buffer: any /* Buffer, or Frame for frame() programs */, userData: any) => void;
  pre?: (context: Context, cursor: any, buffer: any[], userData: any) => void;
  main?: (
    position: Coord,
    context: Context,
    cursor: any,
    buffer: any[],
    userData: any
  ) => any;
  post?: (context: Context, cursor: any, buffer: any[], userData: any) => void;
  // Fast API: fills the whole frame (typed arrays) in one call. When present,
  // pre(), main() and post() are not called; boot() and events get the frame.
  frame?: (context: Context, cursor: any, frame: Frame, userData: any) => void;
  settings?: Settings;
  [key: string]: any;
};

export interface Pointer {
  x: number;
  y: number;
  pressed: boolean;
  px: number;
  py: number;
  ppressed: boolean;
}

export type Cell =
  | Record<string, any> & {
      char: string;
      color?: string;
      backgroundColor?: string;
      fontWeight?: string;
      shadowStyle?: string;
      borderStyle?: string;
      shadowX?: number;
      shadowY?: number;
    };
export type Buffer = Array<Cell>;
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
