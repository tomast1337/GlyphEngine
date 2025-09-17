/**
[header]
@author ertdfgcvb
@title  Camera double resolution
@desc   Doubled vertical resolution input from camera
*/

import  { color,canvas,camera,drawbox } from "glyph-engine";
import type{ Buffer, Context, Coord, Cursor } from "glyph-engine";

const cam = camera.default.init();
const can = new canvas.default();
// For a debug view uncomment the following line:
// can.display(document.body, 10, 10)

// Palette for quantization
const pal: color.AugmentedPaletteElement[] = [];
pal.push(color.CSS3.red!);
pal.push(color.CSS3.blue!);
pal.push(color.CSS3.white!);
pal.push(color.CSS3.black!);
pal.push(color.CSS3.lightblue!);

// Camera data
const data: Buffer = [];

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
  const a = context.metrics.aspect;

  // The canvas is resized to the double of the height of the context
  can.resize(context.cols, context.rows * 2);

  // Also the aspect ratio needs to be doubled
  can
    .cover(cam, a * 2)
    .quantize(pal)
    .mirrorX()
    .writeTo(data as any);
}

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  // Coord also contains the index of each cell:
  const idx = coord.y * context.cols * 2 + coord.x;
  const upper = data[idx]!;
  const lower = data[idx + context.cols]!;

  return {
    char: "▄",
    color: lower.hex,
    backgroundColor: upper.hex,
  };
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
    drawbox.drawInfo(context, cursor, buffer);
}
