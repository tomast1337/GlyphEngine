/**
[header]
@author Alex Miller
@title  GOL
@desc   Conway's Game of Life
See https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life
Each frame of the animation depends on the previous frame. Code in the `pre()`
function saves the previous frame so it can be used in `main()`.
*/

import { Buffer, Context, Coord, Cursor } from "../../modules/types";
import { dist } from "../../modules/vec2.js";

let prevFrame: Buffer;
let width: number, height: number;

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
  if (width != context.cols || height != context.rows) {
    const length = context.cols * context.rows;
    for (let i = 0; i < length; i++) {
      buffer[i] = { char: Math.random() > 0.5 ? "▒" : " " } as any;
    }
    width = context.cols;
    height = context.rows;
  }

  // Use the spread operator to copy the previous frame
  // You must make a copy, otherwise `prevFrame` will be updated prematurely
  prevFrame = [...buffer];
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  if (cursor.pressed) {
    if (dist(coord, cursor) < 3) {
      return Math.random() > 0.5 ? "▒" : " ";
    }
  }

  const { x, y } = coord;
  const neighbors =
    get(x - 1, y - 1) +
    get(x, y - 1) +
    get(x + 1, y - 1) +
    get(x - 1, y) +
    get(x + 1, y) +
    get(x - 1, y + 1) +
    get(x, y + 1) +
    get(x + 1, y + 1);

  const current = get(x, y);
  if (current == 1) {
    return neighbors == 2 || neighbors == 3 ? "▒" : " ";
  } else if (current == 0) {
    return neighbors == 3 ? "x" : " ";
  }
}

function get(x: number, y: number) {
  if (x < 0 || x >= width) return 0;
  if (y < 0 || y >= height) return 0;
  const index = y * width + x;
  return prevFrame[index].char === " " ? 0 : 1;
}
