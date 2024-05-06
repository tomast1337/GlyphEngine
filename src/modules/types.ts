import { Vec2 } from "./vec2";

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
  settings: {
    textAlign: string;
    canvasOffset: any;
    canvasSize: any;
    fontWeight: string | number;
    backgroundColor: string;
    color: string;
    element: HTMLElement;
  };
  runtime: {
    fps: number;
  };
  frame: number;
  time: number;
  cols: number;
  rows: number;
  metrics: {
    fontSize: string;
    fontFamily: string;
    lineHeight: number;
    cellWidth: number;
    aspect: number;
  };
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
