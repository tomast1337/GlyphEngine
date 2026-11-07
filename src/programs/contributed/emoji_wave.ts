/**
[header]
@author ilithya
@title  Emoji Wave
@desc   From wingdings icons to unicode emojis
		Inspired by emojis evolution
*/
import type { Buffer, Context, Coord, Cursor } from "glyph-engine";

export const settings = {
  color: "white",
  backgroundColor: "rgb(100, 0, 300)",
};

const { sin, cos, floor } = Math;
// Split by grapheme, not UTF-16 unit: indexing the string would cut emoji in half.
// Emoji are two cells wide: an empty cell after each keeps them from overlapping
// on canvas/WebGL, and adds no width in the DOM renderer.
const density = Array.from(new Intl.Segmenter().segment("☆ ☺︎ 👀 🌈 🌮🌮 🌈 👀 ☺︎ ☆"), (s) => s.segment).flatMap((g) =>
  /\p{Emoji_Presentation}/u.test(g) ? [g, ""] : [g]
);

export function main(
  coord: Coord,
  context: Context,
  cursor: Cursor,
  buffer: Buffer
) {
  const t = context.time * 0.0008;

  const x = coord.x;
  const y = coord.y;

  const c = context.cols;
  const posCenter = floor((c - density.length) * 0.5);

  const wave = sin(y * cos(t)) * 5;

  const i = floor(x + wave) - posCenter;

  // Note: “undefined” is rendered as a space…
  return density[i];
}
