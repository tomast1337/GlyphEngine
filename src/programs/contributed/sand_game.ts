/**
[header]
@author Alex Miller
@title  Sand game
@desc   Click to drop sand
*/

import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";
import { vec2 } from "glyph-engine";

let prevFrame: Buffer;
let width: number, height: number;

function newParticle() {
  return "sand".charAt(Math.random() * 4);
}

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
  if (width != context.cols || height != context.rows) {
    const length = context.cols * context.rows;
    for (let i = 0; i < length; i++) {
      buffer[i] = { char: Math.random() > 0.5 ? newParticle() : " " };
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
  out: CellOut
) {
  if (cursor.pressed) {
    if (vec2.dist(coord, cursor) < 3) {
      out.char = Math.random() > 0.5 ? newParticle() : " ";

      out.background = "white";
      out.color = "rgb(179, 158, 124)";
      out.fontWeight = 500;
      return;
    }
  }

  const { x, y } = coord;

  const me = get(x, y);
  const below = get(x, y + 1);
  const above = get(x, y - 1);

  const left = get(x - 1, y);
  const right = get(x + 1, y);

  const topleft = get(x - 1, y - 1);
  const topright = get(x + 1, y - 1);
  const bottomleft = get(x - 1, y + 1);
  const bottomright = get(x + 1, y + 1);
  const frame = context.frame;

  if (y >= context.rows - 1) {
    out.char = "GROUND_".charAt(x % 7);
    out.background = "rgb(138, 162, 70)";
    out.color = "rgb(211, 231, 151)";
    out.fontWeight = 700;
    return;
  }

  if (x >= context.cols - 1 || x <= 0) {
    out.char = "WALL".charAt(y % 4);
    out.background = "rgb(247, 187, 39)";
    out.color = "white";
    out.fontWeight = 700;
    return;
  }

  let char = " ";
  if (alive(me)) {
    if (
      alive(below) &&
      ((frame % 2 == 0 && alive(bottomright)) ||
        (frame % 2 == 1 && alive(bottomleft)))
    ) {
      char = me;
    } else {
      char = " ";
    }
  } else {
    if (alive(above)) {
      char = above;
    } else if (alive(left) && frame % 2 == 0 && alive(topleft)) {
      char = topleft;
    } else if (alive(right) && frame % 2 == 1 && alive(topright)) {
      char = topright;
    } else {
      char = " ";
    }

    if ("WALL".indexOf(char) > -1) {
      char = " ";
    }
  }

  out.char = char;
  out.background = "white";
  out.color = "rgb(179, 158, 124)";
  out.fontWeight = 500;
}

function alive(char: string) {
  return char != " ";
}

// Outside the grid is empty
function get(x: number, y: number) {
  if (x < 0 || x >= width) return " ";
  if (y < 0 || y >= height) return " ";
  const index = y * width + x;
  return prevFrame[index]!.char;
}
