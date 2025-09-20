/**
[header]
@author ertdfgcvb
@title  Spiral
@desc   Shadertoy port
Inspired by this shader by ahihi
https://www.shadertoy.com/view/XdSGzR
*/

import { drawbox,num,vec2,sort as sort2 } from "glyph-engine";
import type { Buffer, Context, Coord, Cursor } from "glyph-engine";
const { drawInfo } = drawbox;
const { sort } = sort2 ;
const { length } = vec2;

export const settings = { fps: 60 };

const { sin, cos, floor, PI, atan, sqrt, pow } = Math;
const TAU = PI * 2;

const density = sort("▅▃▁?ab012:. ", "Simple Console", false);

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time * 0.0006;
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;

  let st = {
    x: ((2.0 * (coord.x - context.cols / 2)) / m) * a,
    y: (2.0 * (coord.y - context.rows / 2)) / m,
  };

  const radius = length(st);
  const rot = 0.03 * TAU * t;
  //const turn = atan(st.y, st.x) / TAU + rot;
  const turn = atan(st.y) / TAU + rot;

  const n_sub = 1.5;

  const turn_sub = (n_sub * turn) % n_sub;

  const k = 0.1 * sin(3.0 * t);
  const s = k * sin(50.0 * (pow(radius, 0.1) - 0.4 * t));
  const turn_sine = turn_sub + s;

  const i_turn = floor((density.length * turn_sine) % density.length);
  const i_radius = floor(1.5 / pow(radius * 0.5, 0.6) + 5.0 * t);
  const idx = (i_turn + i_radius) % density.length;

  return density[idx];
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer, {
    color: "white",
    backgroundColor: "royalblue",
    shadowStyle: "gray",
  });
}
