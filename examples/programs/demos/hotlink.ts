/**
[header]
@author ertdfgcvb
@title  Hotlink
@desc   Function hotlink example (GitHub)
        The code for the Open Simplex Noise function is downloaded from GitHub
        and evaluated through “new Function()”.
*/
import type { Buffer, Context, Coord, Cursor } from "../../modules";

// Don’t do this :)
fetch(
  "https://raw.githubusercontent.com/blindman67/SimplexNoiseJS/master/simplexNoise.js"
)
  .then((e) => e.text())
  .then((e) => {
    const openSimplexNoise = new Function("return " + e)();
    noise3D = openSimplexNoise(Date.now()).noise3D;
  });

// Stub function
let noise3D: (x: number, y: number, z: number) => number = () => 0;

const density = "Ñ@#W$9876543210?!abcxyz;:+=-,._ ";

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time * 0.0007;
  const s = 0.03;
  const x = coord.x * s;
  const y = (coord.y * s) / context.metrics.aspect + t;
  const i = Math.floor((noise3D(x, y, t) * 0.5 + 0.5) * density.length);
  return density[i];
}
