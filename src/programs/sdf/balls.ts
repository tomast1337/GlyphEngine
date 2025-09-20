/**
[header]
@author ertdfgcvb
@title  Balls
@desc   Smooth SDF balls
*/



import type { Buffer, Context, Coord, Cursor } from "glyph-engine";
import  { num as num2, vec2 ,sdf} from "glyph-engine";

const density = "#ABC|/:÷×+-=?*· ";

const { PI, sin, cos, exp, abs } = Math;

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time * 0.001 + 10;
  const m = Math.min(context.cols, context.rows);
  const a = context.metrics.aspect;

  const st = {
    x: ((2.0 * (coord.x - context.cols / 2)) / m) * a,
    y: (2.0 * (coord.y - context.rows / 2)) / m,
  };

  // const z = map(Math.sin(t * 0.00032), -1, 1, 0.5, 1)
  // st.x *= z
  // st.y *= z

  const s = num2.map(sin(t * 0.5), -1, 1, 0.0, 0.9);

  let d = Number.MAX_VALUE;

  const num = 12;
  for (let i = 0; i < num; i++) {
    const r = num2.map(cos((t * 0.95 * (i + 1)) / (num + 1)), -1, 1, 0.1, 0.3);
    const x = num2.map(cos(t * 0.23 * ((i / num) * PI + PI)), -1, 1, -1.2, 1.2);
    const y = num2.map(sin(t * 0.37 * ((i / num) * PI + PI)), -1, 1, -1.2, 1.2);
    const f = transform(st, { x, y }, t);
    d = sdf.opSmoothUnion(d, sdf.sdCircle(f, r), s);
  }

  let c = 1.0 - exp(-3 * abs(d));
  //if (d < 0) c = 0

  const index = Math.floor(c * density.length);

  return density[index];
}

function transform(p: vec2.Vec2, trans: vec2.Vec2, rot: number) {
  const s = sin(-rot);
  const c = cos(-rot);
  const dx = p.x - trans.x;
  const dy = p.y - trans.y;
  return {
    x: dx * c - dy * s,
    y: dx * s + dy * c,
  };
}
