/**
[header]
@author ertdfgcvb
@title  Camera RGB
@desc   Color input from camera (quantised)
*/

import { camera, canvas, color, drawbox, sort } from '@glyph-engine/web';
import type { Buffer, CellOut, Context, Coord, Cursor } from '@glyph-engine/web';

const cam = camera.default.init();
const can = new canvas.default();
// For a debug view uncomment the following line:
// can.display(document.body, 10, 10)

const density = ' .+=?X#ABC';

// A custom palette used for color quantisation:
const pal: color.RGB[] = [];
pal.push(color.rgb(0, 0, 0));
pal.push(color.rgb(255, 0, 0));
pal.push(color.rgb(255, 255, 0));
pal.push(color.rgb(0, 100, 250));
pal.push(color.rgb(100, 255, 255));
//pal.push(color.rgb(255, 182, 193))
//pal.push(color.rgb(255, 255, 255))

// quantize() turns every pixel into a palette entry
const data: color.RGB[] = [];

export function pre(context: Context, cursor: Cursor, buffer: Buffer) {
    const a = context.metrics.aspect;

    // The canvas is resized so that 1 cell -> 1 pixel
    can.resize(context.cols, context.rows);
    // The cover() function draws an image (cam) to the canvas covering
    // the whole frame. The aspect ratio can be adjusted with the second
    // parameter.
    can.cover(cam, a).mirrorX().quantize(pal).writeTo(data);
}

export function main(coord: Coord, context: Context, cursor: Cursor, out: CellOut) {
    // Coord also contains the index of each cell
    const px = data[coord.index]!;
    // Add some chars to the output
    const index = Math.floor(px.v! * (density.length - 1));
    out.char = density[index];
    out.color = 'white';
    // convert {r,g,b} obj to a valid CSS hex string
    out.background = color.rgb2hex(px);
}

export function post(context: Context, cursor: Cursor, buffer: Buffer) {
    drawbox.drawInfo(context, cursor, buffer);
}
