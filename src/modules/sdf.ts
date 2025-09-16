/**
@module   sdf
@desc     Some signed distance functions
@category public

SDF functions ported from the almighty Inigo Quilezles:
https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
*/

import { clamp, mix } from "./num.js";
import { type Vec2, dot, length, mulN, sub } from "./vec2.js";

export function sdCircle(p: Vec2, radius: number) {
  return length(p) - radius;
}

export function sdBox(p: Vec2, size: Vec2) {
  const d = {
    x: Math.abs(p.x) - size.x,
    y: Math.abs(p.y) - size.y,
  };
  d.x = Math.max(d.x, 0);
  d.y = Math.max(d.y, 0);
  return length(d) + Math.min(Math.max(d.x, d.y), 0.0);
}

export function sdSegment(p: Vec2, a: Vec2, b: Vec2, thickness: number) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(sub(pa, mulN(ba, h))) - thickness;
}

export function opSmoothUnion(d1: number, d2: number, k: number) {
  const h = clamp(0.5 + (0.5 * (d2 - d1)) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

export function opSmoothSubtraction(d1: number, d2: number, k: number) {
  const h = clamp(0.5 - (0.5 * (d2 + d1)) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}

export function opSmoothIntersection(d1: number, d2: number, k: number) {
  const h = clamp(0.5 - (0.5 * (d2 - d1)) / k, 0.0, 1.0);
  return mix(d2, d1, h) + k * h * (1.0 - h);
}
