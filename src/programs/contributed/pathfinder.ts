/**
[header]
@author Alex Miller
@title  Pathfinder
@desc   Click to spawn new path segments
*/

import type { Buffer, Context, Coord, Cursor } from "glyph-engine";
import { vec2 as v2 } from "glyph-engine";

const vec2 = v2.vec2;

let prevFrame: Buffer;
let width: number, height: number;

const colors = ["red", "orange", "yellow", "green", "blue", "indigo", "violet"];

export const settings = {
  fps: 30, // fps capping
  backgroundColor: "#000000", // background color of the container element
};

const roads = "┃━┏┓┗┛┣┫┳┻╋";

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
  if (width != context.cols || height != context.rows) {
    const length = context.cols * context.rows;
    for (let i = 0; i < length; i++) {
      buffer[i] =
        Math.random() < 0.001
          ? {
              char: choose(roads),
              color: "white",
            }
          : (" " as any);
    }
    width = context.cols;
    height = context.rows;
  }

  // Use the spread operator to copy the previous frame
  // You must make a copy, otherwise `prevFrame` will be updated prematurely
  prevFrame = [...buffer];
}

function choose(list: string) {
  return list.charAt(Math.floor(Math.random() * list.length));
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const { x, y } = coord;
  if (
    cursor.pressed &&
    Math.floor(cursor.x) == x &&
    Math.floor(cursor.y) == y &&
    get(x, y) == " "
  ) {
    return {
      char: choose(roads),
      color: "white",
    };
  }

  const last = get(x, y);

  // '┃ ━ ┏ ┓ ┗ ┛ ┣ ┫ ┳ ┻ ╋';

  if (last == " ") {
    let char = " ";

    const top = get(x, y - 1) || " ";
    const bottom = get(x, y + 1) || " ";
    const left = get(x - 1, y) || " ";
    const right = get(x + 1, y) || " ";

    if ("┃┫┣╋┏┓┳".includes(top)) {
      char = choose("┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┗┫┣┻╋");
    } else if ("┃┗┛┣┫┻╋".includes(bottom)) {
      char = choose("┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┃┏┓┣┫┳╋");
    } else if ("━┏┗┣┳┻╋".includes(left)) {
      char = choose("━━━━━━━━━━━━━━━━━━━━┓┛┫┳┻╋");
    } else if ("━┓┛┫┳┻╋".includes(right)) {
      char = choose("━━━━━━━━━━━━━━━━━━━━┏┗┣┳┻╋");
    }

    return {
      char,
      color: "white",
    };
  }

  return {
    char: last,
    color: "white",
  };
}

function get(x: number, y: number) {
  if (x < 0 || x >= width) return 0;
  if (y < 0 || y >= height) return 0;
  const index = y * width + x;
  return prevFrame[index]!.char;
}
