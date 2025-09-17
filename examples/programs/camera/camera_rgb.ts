/**
[header]
@author ertdfgcvb
@title  Camera RGB
@desc   Color input from camera (quantised)
*/

import  { canvas,camera,drawbox,sort ,color} from "glyph-engine";
import type { Buffer, Context, Coord, Cursor } from "glyph-engine";

const cam = camera.default.init();
const can = new canvas.default();
// For a debug view uncomment the following line:
// can.display(document.body, 10, 10)

const density = " .+=?X#ABC";

// A custom palette used for color quantisation:
const pal: color.RGB[] = [];
pal.push(color.rgb(0, 0, 0));
pal.push(color.rgb(255, 0, 0));
pal.push(color.rgb(255, 255, 0));
pal.push(color.rgb(0, 100, 250));
pal.push(color.rgb(100, 255, 255));
//pal.push(color.rgb(255, 182, 193))
//pal.push(color.rgb(255, 255, 255))

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
    backgroundColor: color.rgb2hex(color),
  };
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
  drawbox.drawInfo(context, cursor, buffer);
}
