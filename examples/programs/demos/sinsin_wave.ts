/**
[header]
@author ertdfgcvb
@title  Sin Sin
@desc   Wave variation
*/
import { drawInfo } from "../../modules/drawbox";
import type { Buffer, Context, Coord, Cursor } from "../../modules";
const pattern = "┌┘└┐╰╮╭╯";

const { sin, round, abs } = Math;

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time * 0.0005;
  const x = coord.x;
  const y = coord.y;
  const o = sin(y * x * sin(t) * 0.003 + y * 0.01 + t) * 20;
  const i = round(abs(x + y + o)) % pattern.length;
  return pattern[i];
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, { shadowStyle: "gray" });
}
