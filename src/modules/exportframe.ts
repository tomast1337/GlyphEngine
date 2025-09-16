/**
@module   exportframe.ts
@desc     Exports a single frame (or a range) to an image
@category public

Exports a frame as image.
Expects the canvas renderer as the active renderer.
Tested on Safari, FF, Chrome
*/

import { saveBlobAsFile } from "./filedownload";
import type { Context } from "./types";

export function exportFrame(
  context: Context,
  filename: string,
  from = 1,
  to = from
) {
  // Error: renderer is not canvas.
  // A renderer instance could be imported here and the content of the buffer
  // rendere to a tmp canvas… maybe overkill: let’s keep things simple for now.
  const canvas = context.settings.element as HTMLCanvasElement;
  if (canvas.nodeName != "CANVAS") {
    console.warn(
      "exportframe.js: Can’t export, a canvas renderer is required."
    );
    return;
  }

  // Error: filename not provided.
  // The function doesn’t provide a default name: this operation will probably
  // flood the “Downloads” folder with images…
  // It’s probably better to require a user-provided filename at least.
  if (!filename) {
    console.warn("exportframe.js: Filename not provided.");
    return;
  }

  // Filename chunks
  const m = filename.match(/(.+)\.([0-9a-z]+$)/i) || [];
  if (m.length < 3) {
    console.warn("exportframe.js: Invalid filename.");
    return;
  }
  const base = m[1];
  const ext = m[2];

  // Finally export the frame
  const f = context.frame;
  if (f >= from && f <= to) {
    const out = base + "_" + f.toString().padStart(5, "0") + "." + ext;
    console.info(
      "exportframe.js: Exporting frame " + out + ". Will stop at " + to + "."
    );
    canvas.toBlob((blob) => {
      if (!blob) {
        console.warn("exportframe.js: No data to export.");
        return;
      }
      saveBlobAsFile(blob, out);
    });
  }
}
