/**
[header]
@author ertdfgcvb
@title  Camera grayscale
@desc   Grayscale input from camera
*/

import  { canvas,camera,drawbox,sort } from "play.core";
import type { Buffer, Context, Coord, Cursor } from "play.core";

const cam = camera.default.init();
const can = new canvas.default();
// For a debug view uncomment the following line:
// can.display(document.body, 10, 10)

const density = sort.sort(" .x?▂▄▆█", "Simple Console", false);

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
    drawbox.drawInfo(context, cursor, buffer);
}
