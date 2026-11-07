import type { Context } from "../modules/types";

// Sizes the canvas backing store for the current frame. Shared by the canvas
// and WebGL renderers. Assigning width/height, even the same value,
// reallocates the canvas and resets the context, so only do it on a real
// change (size or devicePixelRatio). Math.trunc matches how the browser
// stores a fractional size.
export function fitCanvas(canvas: HTMLCanvasElement, context: Context, scale: number) {
  const size = context.settings.canvasSize;
  const w = Math.trunc((size ? size.width : context.width) * scale);
  const h = Math.trunc((size ? size.height : context.height) * scale);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  // Fixed size, to allow precise export
  if (size) {
    canvas.style.width = size.width + "px";
    canvas.style.height = size.height + "px";
  }
}
