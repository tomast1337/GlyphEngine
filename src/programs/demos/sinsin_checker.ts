/**
[header]
@author ertdfgcvb
@title  Sin Sin
@desc   Checker variation
*/
import { drawbox } from "glyph-engine";
import type { Buffer, CellOut, Context, Coord, Cursor } from "glyph-engine";
const { drawInfo } = drawbox;

const pattern = [" _000111_ ", ".+abc+.      "];
const col = ["black", "blue"];
const weights = [100, 700];

const { floor, sin } = Math;

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  out: CellOut
) {
  const t = context.time * 0.001;
  const x = coord.x - context.cols / 2;
  const y = coord.y - context.rows / 2;
  const o = sin(x * y * 0.0017 + y * 0.0033 + t) * 40;
  const i = floor(Math.abs(x + y + o));
  const c = (floor(coord.x * 0.09) + floor(coord.y * 0.09)) % 2;
  out.char = pattern[c]![i % pattern[c]!.length];
  out.color = "black"; //col[c],
  // out.background = col[(c+1)%2];
  out.fontWeight = weights[c];
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, { shadowStyle: "gray" });
}
