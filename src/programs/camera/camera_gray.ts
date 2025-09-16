/**
[header]
@author ertdfgcvb
@title  Camera grayscale
@desc   Grayscale input from camera
*/

import Camera from "../../modules/camera";
import Canvas from "../../modules/canvas";
import { drawInfo } from "../../modules/drawbox";
import { sort } from "../../modules/sort";
import type { Buffer, Context, Coord, Cursor } from "../../modules";

const cam = Camera.init();
const can = new Canvas();
// For a debug view uncomment the following line:
// can.display(document.body, 10, 10)

const density = sort(" .x?▂▄▆█", "Simple Console", false);

const data: Buffer = [];

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
  const a = context.metrics.aspect;

  // The canvas is resized so that 1 cell -> 1 pixel
  can.resize(context.cols, context.rows);
  // The cover() function draws an image (cam) to the canvas covering
  // the whole frame. The aspect ratio can be adjusted with the second
  // parameter.
  can
    .cover(cam, a)
    .mirrorX()
    .normalize()
    .writeTo(data as any);
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  // Coord also contains the index of each cell:
  const color = data[coord.index]!;
  const index = Math.floor(color.v * (density.length - 1));
  return density[index];
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer);
}
