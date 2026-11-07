// Runs a program without the DOM: fixed metrics, fixed time step, no input.
// Shared by the snapshot tests and the benchmark's computation timing.
import { computeFrame } from "../src/run";
import type { Buffer, Context, Cursor, Program } from "../src/modules/types";

const metrics = { aspect: 0.5, cellWidth: 8, lineHeight: 16, fontFamily: "monospace", fontSize: 13 };
const cursor = { x: 0, y: 0, pressed: false, p: { x: 0, y: 0, pressed: false } } as Cursor;

export function makeRunner(program: Program, cols: number, rows: number) {
  const settings = { fps: 30, ...program.settings } as Context["settings"];
  const interval = 1000 / settings.fps;
  const buffer: Buffer = Array.from({ length: cols * rows }, () => ({
    char: " ",
    color: settings.color,
    backgroundColor: settings.backgroundColor,
    fontWeight: settings.fontWeight,
  }));
  let frame = 0;
  // One engine frame; returns the buffer it wrote to.
  return function step() {
    frame++;
    const context = Object.freeze({
      frame,
      time: frame * interval,
      cols,
      rows,
      metrics,
      width: cols * metrics.cellWidth,
      height: rows * metrics.lineHeight,
      settings,
      runtime: Object.freeze({ cycle: 0, fps: settings.fps }),
    }) as unknown as Context;
    computeFrame(program, context, cursor, buffer);
    return buffer;
  };
}
