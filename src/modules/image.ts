/**
@module   image.ts
@desc     Image loader and helper
@category public

Loads an image and draws it on a canvas.
The returned object is a canvas wrapper and its methods (get, sample, etc.)
can be used before the image has completely loaded.

Usage:
// Starts async loading:
const img = Image.load('res/pattern.png')
// Returns a black color until the image has been loaded:
const color = img.get(10, 10)

*/

import Canvas from "./canvas";
import Load from "./load";

export default {
  load,
};

function load(path: string) {
  const source = document.createElement("canvas");
  source.width = 1;
  source.height = 1;

  const can = new Canvas(source);

  Load.image(path)
    .then((img: unknown) => {
      if (!img) {
        console.warn("Image " + path + " could not be loaded.");
        return;
      }

      const imageElement = img as HTMLImageElement;
      console.log(
        "Image " +
          path +
          " loaded. Size: " +
          imageElement.width +
          "×" +
          imageElement.height
      );
      can.resize(imageElement.width, imageElement.height);
      can.copy(
        imageElement,
        // add by now
        0,
        0,
        imageElement.width,
        imageElement.height,
        0,
        0,
        imageElement.width,
        imageElement.height
      );
    })
    .catch((err) => {
      console.warn("There was an error loading image " + path + ".");
    });

  return can;
}
