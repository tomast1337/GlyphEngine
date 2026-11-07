/**
[header]
@author Nicolas Vyčas Nery
@title  Rain
@desc   State kept between frames: fade what was drawn before
*/

import { rgba, drawbox } from "glyph-engine";
import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";

export const settings = { backgroundColor: "black", fps: 60 };

// main() starts every cell empty, so the rain keeps its own picture: a glyph
// and a colour per cell. pre() fades it and draws the drops, main() copies it
// into `out`.
//
// Speed and fade are per second, scaled by context.delta (ms since the last
// frame), so the rain looks the same at any frame rate: try fps: 10.
const SPEED = 30; // rows per second
const FADE = 0.02; // brightness left after one second
const glyphs = [..."0123456789ABCDEF:.=*+-<>|"];
const head = rgba(220, 255, 220);
let drops: number[] = []; // row of the drop in each column (fractional)
let chars: string[] = []; // glyph of each cell
let fg = new Uint32Array(0); // packed colour of each cell

export function pre(context: Context, cursor: Cursor) {
  const { cols, rows } = context;
  if (drops.length !== cols) drops = Array.from({ length: cols }, () => -Math.random() * rows);
  if (fg.length !== cols * rows) {
    chars = new Array(cols * rows).fill(" ");
    fg = new Uint32Array(cols * rows);
  }

  // Fade every cell: read the packed green channel, write it back darker.
  const fade = Math.pow(FADE, context.delta / 1000);
  for (let k = 0; k < fg.length; k++) {
    const g = (fg[k]! >>> 16) & 255;
    if (g < 40) chars[k] = " "; // faded out: clear the glyph
    fg[k] = rgba(0, g * fade, 0);
  }

  // Click to start a drop in that column
  const cx = Math.floor(cursor.x);
  if (cursor.pressed && cx >= 0 && cx < cols) drops[cx] = Math.floor(cursor.y);

  const step = (SPEED * context.delta) / 1000;
  for (let x = 0; x < cols; x++) {
    const from = Math.floor(drops[x]!);
    drops[x]! += step;
    const to = Math.floor(drops[x]!);
    // Every row passed since the last frame (several when the frame rate is low)
    for (let y = Math.max(0, from + 1); y <= to && y < rows; y++) {
      const k = x + y * cols;
      chars[k] = glyphs[Math.floor(Math.random() * glyphs.length)]!;
      fg[k] = head;
    }
    if (to >= rows) drops[x] = -Math.random() * rows; // restart above the top
  }
}

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
  out.char = chars[coord.index];
  out.color = fg[coord.index]!;
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawbox.drawInfo(context, cursor, buffer);
}
