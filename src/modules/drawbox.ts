/**
@module   drawbox.ts
@desc     Draw text boxes with optional custom styles
@category public

A style object can be passed to override the default style:

const style = {
    x               : 3,
    y               : 2,
    width           : 0,
    height          : 0,
    backgroundColor : 'white',
    color           : 'black',
    fontWeight      : 'normal',
    shadowStyle     : 'none',
    borderStyle     : 'round'
    paddingX        : 2,
    paddingY        : 1,
}
*/

import { merge, mergeRect, mergeText, setRect } from "./buffer";
import { measure } from "./string";
import type { Buffer, Context, Cursor, Style, WithRequired } from "./types";

type BorderStyle = {
  topleft: string;
  topright: string;
  bottomright: string;
  bottomleft: string;
  top: string;
  bottom: string;
  left: string;
  right: string;
  bg: string;
};

type BorderName =
  | "double"
  | "single"
  | "round"
  | "singleDouble"
  | "fat"
  | "none";

// The drawing styles for the borders.
const borderStyles: Record<BorderName, BorderStyle> = {
  double: {
    topleft: "╔",
    topright: "╗",
    bottomright: "╝",
    bottomleft: "╚",
    top: "═",
    bottom: "═",
    left: "║",
    right: "║",
    bg: " ",
  },
  single: {
    topleft: "┌",
    topright: "┐",
    bottomright: "┘",
    bottomleft: "╰",
    top: "─",
    bottom: "─",
    left: "│",
    right: "│",
    bg: " ",
  },
  round: {
    topleft: "╭",
    topright: "╮",
    bottomright: "╯",
    bottomleft: "╰",
    top: "─",
    bottom: "─",
    left: "│",
    right: "│",
    bg: " ",
  },
  singleDouble: {
    topleft: "┌",
    topright: "╖",
    bottomright: "╝",
    bottomleft: "╘",
    top: "─",
    bottom: "═",
    left: "│",
    right: "║",
    bg: " ",
  },
  fat: {
    topleft: "█",
    topright: "█",
    bottomright: "█",
    bottomleft: "█",
    top: "▀",
    bottom: "▄",
    left: "█",
    right: "█",
    bg: " ",
  },
  none: {
    topleft: " ",
    topright: " ",
    bottomright: " ",
    bottomleft: " ",
    top: " ",
    bottom: " ",
    left: " ",
    right: " ",
    bg: " ",
  },
};

// The glyphs to draw a shadow.
const shadowStyles = {
  light: {
    char: "░",
  },
  medium: {
    char: "▒",
  },
  dark: {
    char: "▓",
  },
  solid: {
    char: "█",
  },
  checker: {
    char: "▚",
  },
  x: {
    char: "╳",
  },
  gray: {
    color: "dimgray",
    backgroundColor: "lightgray",
  },
  none: {},
};

const defaultTextBoxStyle: Style = {
  x: 2,
  y: 1,
  width: 0, // auto width
  height: 0, // auto height
  paddingX: 2, // text offset from the left border
  paddingY: 1, // text offset from the top border
  backgroundColor: "white",
  color: "black",
  fontWeight: "normal",
  shadowStyle: "none",
  borderStyle: "round",
  shadowX: 2, // horizontal shadow offset
  shadowY: 1, // vertical shadow offset
};

export function drawBox(
  text: string,
  style: Partial<Style>,
  target: Buffer,
  targetCols?: number,
  targetRows?: number
) {
  const s = { ...defaultTextBoxStyle, ...style };

  let boxWidth = s.width;
  let boxHeight = s.height;

  const spaddingX = s.paddingX || 0;
  const spaddingY = s.paddingY || 0;

  if (!boxWidth || !boxHeight) {
    const m = measure(text);
    boxWidth = boxWidth || m.maxWidth + spaddingX * 2;
    boxHeight = boxHeight || m.numLines + spaddingY * 2;
  }

  const sx = s.x || 0;
  const sy = s.y || 0;

  const x1 = sx;
  const y1 = sy;
  const x2 = sx + boxWidth - 1;
  const y2 = sy + boxHeight - 1;
  const w = boxWidth;
  const h = boxHeight;

  const border =
    borderStyles[s.borderStyle as keyof typeof borderStyles] ||
    borderStyles["round"];

  // Background, overwrite the buffer
  setRect(
    {
      char: border.bg,
      color: s.color,
      fontWeight: s.fontWeight,
      backgroundColor: s.backgroundColor,
    },
    x1,
    y1,
    w,
    h,
    target,
    targetCols,
    targetRows
  );

  // Corners
  merge({ char: border.topleft }, x1, y1, target, targetCols, targetRows);
  merge({ char: border.topright }, x2, y1, target, targetCols, targetRows);
  merge({ char: border.bottomright }, x2, y2, target, targetCols, targetRows);
  merge({ char: border.bottomleft }, x1, y2, target, targetCols, targetRows);

  // Top & Bottom
  mergeRect(
    { char: border.top },
    x1 + 1,
    y1,
    w - 2,
    1,
    target,
    targetCols,
    targetRows
  );
  mergeRect(
    { char: border.bottom },
    x1 + 1,
    y2,
    w - 2,
    1,
    target,
    targetCols,
    targetRows
  );

  // Left & Right
  mergeRect(
    { char: border.left },
    x1,
    y1 + 1,
    1,
    h - 2,
    target,
    targetCols,
    targetRows
  );
  mergeRect(
    { char: border.right },
    x2,
    y1 + 1,
    1,
    h - 2,
    target,
    targetCols,
    targetRows
  );

  // Shadows
  const ss =
    shadowStyles[s.shadowStyle as keyof typeof shadowStyles] ||
    shadowStyles["none"];
  if (ss !== shadowStyles["none"]) {
    const ox = s.shadowX || 0;
    const oy = s.shadowY || 0;
    // Shadow Bottom
    mergeRect(ss, x1 + ox, y2 + 1, w, oy, target, targetCols, targetRows);
    // Shadow Right
    mergeRect(ss, x2 + 1, y1 + oy, ox, h - oy, target, targetCols, targetRows);
  }

  // Txt
  mergeText(
    {
      text,
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontWeight: style.fontWeight,
    },
    x1 + spaddingX,
    y1 + spaddingY,
    target,
    targetCols,
    targetRows
  );
}

// -- Utility for some info output ---------------------------------------------

const defaultInfoStyle = {
  width: 24,
  backgroundColor: "white",
  color: "black",
  fontWeight: "normal",
  shadowStyle: "none",
  borderStyle: "round",
};

export function drawInfo(
  context: Context,
  cursor: Cursor,
  target: Buffer,
  style?: Partial<Style>
) {
  let info = "";
  info += "FPS         " + Math.round(context.runtime.fps) + "\n";
  info += "frame       " + context.frame + "\n";
  info += "time        " + Math.floor(context.time) + "\n";
  info += "size        " + context.cols + "×" + context.rows + "\n";
  // info += 'row repaint ' + context.runtime.updatedRowNum + '\n'
  info += "font aspect " + context.metrics.aspect.toFixed(2) + "\n";
  info +=
    "cursor      " + Math.floor(cursor.x) + "," + Math.floor(cursor.y) + "\n";
  // NOTE: width and height can be a float in case of user zoom
  // info += 'context      ' + Math.floor(context.width) + '×' + Math.floor(context.height) + '\n'

  const textBoxStyle = { ...defaultInfoStyle, ...style } as Style;

  drawBox(info, textBoxStyle, target, context.cols, context.rows);
}
