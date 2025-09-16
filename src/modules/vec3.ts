/**
@module   vec3
@desc     3D vector helper functions
@category public

- No vector class (a 'vector' is just any object with {x, y, z})
- The functions never modify the original object.
- An optional destination object can be passed as last paremeter to all
  the functions (except vec3()).
- All function can be exported individually or grouped via default export.
- For the default export use:
	import * as Vec3 from '/src/modules/vec3.js'
*/

import { type Vec2, vec2 } from "./vec2";

type Vec3 = { x: number; y: number; z: number };

// Creates a vector
export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

// Copies a vector
export function copy(a: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x;
  out.y = a.y;
  out.z = a.z;

  return out;
}

// Adds two vectors
export function add(a: Vec3, b: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;

  return out;
}

// Subtracts two vectors
export function sub(a: Vec3, b: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;

  return out;
}

// Multiplies a vector by another vector (component-wise)
export function mul(a: Vec3, b: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x * b.x;
  out.y = a.y * b.y;
  out.z = a.z * b.z;

  return out;
}

// Divides a vector by another vector (component-wise)
export function div(a: Vec3, b: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x / b.x;
  out.y = a.y / b.y;
  out.z = a.z / b.z;

  return out;
}

// Adds a scalar to a vector
export function addN(a: Vec3, k: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x + k;
  out.y = a.y + k;
  out.z = a.z + k;

  return out;
}

// Subtracts a scalar from a vector
export function subN(a: Vec3, k: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x - k;
  out.y = a.y - k;
  out.z = a.z - k;

  return out;
}

// Mutiplies a vector by a scalar
export function mulN(a: Vec3, k: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x * k;
  out.y = a.y * k;
  out.z = a.z * k;

  return out;
}

// Divides a vector by a scalar
export function divN(a: Vec3, k: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.x / k;
  out.y = a.y / k;
  out.z = a.z / k;

  return out;
}

// Computes the dot product of two vectors
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Computes the cross product of two vectors
export function cross(a: Vec3, b: Vec3, out: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = a.y * b.z - a.z * b.y;
  out.y = a.z * b.x - a.x * b.z;
  out.z = a.x * b.y - a.y * b.x;
  return out;
}
// Computes the length of vector
export function length(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

// Computes the square of the length of vector
export function lengthSq(a: Vec3): number {
  return a.x * a.x + a.y * a.y + a.z * a.z;
}

// Computes the distance between 2 points
export function dist(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Computes the square of the distance between 2 points
export function distSq(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return dx * dx + dy * dy;
}

// Divides a vector by its Euclidean length and returns the quotient
export function norm(a: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  const l = length(a);
  if (l > 0.00001) {
    out.x = a.x / l;
    out.y = a.y / l;
    out.z = a.z / l;
  } else {
    out.x = 0;
    out.y = 0;
    out.z = 0;
  }

  return out;
}

// Negates a vector
export function neg(v: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = -v.x;
  out.y = -v.y;
  out.z = -v.z;

  return out;
}

// Rotates a vector around the x axis
export function rotX(v: Vec3, ang: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  out.x = v.x;
  out.y = v.y * c - v.z * s;
  out.z = v.y * s + v.z * c;
  return out;
}

// Rotates a vector around the y axis
export function rotY(v: Vec3, ang: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  out.x = v.x * c + v.z * s;
  out.y = v.y;
  out.z = -v.x * s + v.z * c;
  return out;
}

// Rotates a vector around the z axis
export function rotZ(v: Vec3, ang: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  out.x = v.x * c - v.y * s;
  out.y = v.x * s + v.y * c;
  out.z = v.z;
  return out;
}

// Performs linear interpolation on two vectors
export function mix(a: Vec3, b: Vec3, t: number, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = (1 - t) * a.x + t * b.x;
  out.y = (1 - t) * a.y + t * b.y;
  out.z = (1 - t) * a.z + t * b.z;

  return out;
}

// Computes the abs of a vector (component-wise)
export function abs(a: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = Math.abs(a.x);
  out.y = Math.abs(a.y);
  out.z = Math.abs(a.z);

  return out;
}

// Computes the max of two vectors (component-wise)
export function max(a: Vec3, b: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = Math.max(a.x, b.x);
  out.y = Math.max(a.y, b.y);
  out.z = Math.max(a.z, b.z);

  return out;
}

// Computes the min of two vectors (component-wise)
export function min(a: Vec3, b: Vec3, out?: Vec3) {
  out = out || vec3(0, 0, 0);

  out.x = Math.min(a.x, b.x);
  out.y = Math.min(a.y, b.y);
  out.z = Math.min(a.z, b.z);

  return out;
}

// Returns the fractional part of the vector (component-wise)
export function fract(a: Vec3, out?: Vec2) {
  out = out || vec2(0, 0);
  out.x = a.x - Math.floor(a.x);
  out.y = a.y - Math.floor(a.y);
  out.z = a.z - Math.floor(a.z);
  return out;
}

// Returns the floored vector (component-wise)
export function floor(a: Vec3, out?: Vec2) {
  out = out || vec2(0, 0);
  out.x = Math.floor(a.x);
  out.y = Math.floor(a.y);
  out.z = Math.floor(a.z);
  return out;
}

// Returns the ceiled vector (component-wise)
export function ceil(a: Vec3, out?: Vec2) {
  out = out || vec2(0, 0);
  out.x = Math.ceil(a.x);
  out.y = Math.ceil(a.y);
  out.z = Math.ceil(a.z);
  return out;
}

// Returns the rounded vector (component-wise)
export function round(a: Vec3, out?: Vec2) {
  out = out || vec2(0, 0);
  out.x = Math.round(a.x);
  out.y = Math.round(a.y);
  out.z = Math.round(a.z);
  return out;
}
