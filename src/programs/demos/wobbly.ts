/**
[header]
@author ertdfgcvb
@title  Wobbly
@desc   Draw donuts with SDF
*/

import { drawbox,num,sdf,vec2 } from "glyph-engine";
import type { Buffer, Context, Coord, Cursor } from "glyph-engine";
const { drawInfo } = drawbox;
const { fract, map, smoothstep } = num;
const { sdCircle } = sdf;
const { length, rot } = vec2;

const density = "▀▄▚▐─═0123.+?";

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time * 0.001;
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;

  let st = {
    x: ((2.0 * (coord.x - context.cols / 2)) / m) * a,
    y: (2.0 * (coord.y - context.rows / 2)) / m,
  };

  st = rot(st, 0.6 * Math.sin(0.62 * t) * length(st) * 2.5);
  st = rot(st, t * 0.2);

  const s = map(Math.sin(t), -1, 1, 0.5, 1.8);
  const pt = {
    x: fract(st.x * s) - 0.5,
    y: fract(st.y * s) - 0.5,
  };

  const r = 0.5 * Math.sin(0.5 * t + st.x * 0.2) + 0.5;

  const d = sdCircle(pt, r);

  const width = 0.05 + 0.3 * Math.sin(t);

  const k = smoothstep(width, width + 0.2, Math.sin(10 * d + t));
  const c = (1.0 - Math.exp(-3 * Math.abs(d))) * k;

  const index = Math.floor(c * (density.length - 1));

  return {
    char: density[index],
    color: k == 0 ? "orangered" : "royalblue",
    // backgroundColor : coord.y % 2 ? 'white' : 'cornsilk'
  };
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
