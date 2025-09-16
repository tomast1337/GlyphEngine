/**
[header]
@author ertdfgcvb
@title  Camera RGB
@desc   Color input from camera (quantised)
*/

import Camera from "../../modules/camera";
import Canvas from "../../modules/canvas";
import { type RGB, rgb, rgb2hex } from "../../modules/color";
import { drawInfo } from "../../modules/drawbox";
import type { Buffer, Context, Coord, Cursor } from "../../modules";

const cam = Camera.init();
const can = new Canvas();
// For a debug view uncomment the following line:
// can.display(document.body, 10, 10)

const density = " .+=?X#ABC";

// A custom palette used for color quantisation:
const pal: RGB[] = [];
pal.push(rgb(0, 0, 0));
pal.push(rgb(255, 0, 0));
pal.push(rgb(255, 255, 0));
pal.push(rgb(0, 100, 250));
pal.push(rgb(100, 255, 255));
//pal.push(rgb(255, 182, 193))
//pal.push(rgb(255, 255, 255))

const data: any[] = [];

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
    .quantize(pal)
    .writeTo(data as any);
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  // Coord also contains the index of each cell
  const color = data[coord.index];
  // Add some chars to the output
  const index = Math.floor(color.v * (density.length - 1));
  return {
    char: density[index],
    color: "white",
    // convert {r,g,b} obj to a valid CSS hex string
    backgroundColor: rgb2hex(color),
  };
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawInfo(context, cursor, buffer);
}
