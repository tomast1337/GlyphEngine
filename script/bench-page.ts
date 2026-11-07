// Browser entry for script/bench.ts. Bundled and loaded into headless Chromium.
import { run } from "../src/run";
import { makeRunner } from "../tests/harness";
import type { Program } from "../src/modules/types";
import * as plasma from "../src/programs/demos/plasma";
import * as donut from "../src/programs/demos/donut";

const programs: Record<string, Program> = { plasma, donut };

// Manual requestAnimationFrame: the benchmark decides when a frame runs.
// The real one is kept to let the browser lay out and paint between measured
// frames, as it does in a live page; otherwise DOM work piles up across frames.
const realRAF = window.requestAnimationFrame.bind(window);
const painted = () => new Promise((r) => realRAF(() => setTimeout(r, 0)));
let queue: FrameRequestCallback[] = [];
window.requestAnimationFrame = (cb) => (queue.push(cb), 0);
function pump(t: number) {
  const q = queue;
  queue = [];
  for (const cb of q) cb(t);
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

async function bench(cols: number, rows: number, frames: number, warmup: number) {
  const results: Record<string, Record<string, number>> = {};
  for (const [name, program] of Object.entries(programs)) {
    const r: Record<string, number> = {};

    // Computation only: pre, main for every cell, post
    const step = makeRunner(program, cols, rows);
    for (let i = 0; i < warmup; i++) step();
    const times: number[] = [];
    for (let i = 0; i < frames; i++) {
      const t0 = performance.now();
      step();
      times.push(performance.now() - t0);
    }
    r.compute = mean(times);

    // Full engine frame through run(), per renderer
    for (const renderer of ["canvas", "webgl", "text"]) {
      document.body.replaceChildren();
      queue = [];
      run(program, { cols, rows, renderer });
      await document.fonts.ready;
      await Promise.resolve();
      // run() waits 3 rAF before boot; each pumped t is a full second so no frame is skipped
      let t = 0;
      for (let i = 0; i < 3 + warmup; i++) pump((t += 1000));
      const times: number[] = [];
      for (let i = 0; i < frames; i++) {
        await painted();
        const t0 = performance.now();
        pump((t += 1000));
        times.push(performance.now() - t0);
      }
      r[renderer] = mean(times);
    }
    results[name] = r;
  }
  return results;
}

declare global {
  interface Window {
    bench: typeof bench;
  }
}
window.bench = bench;
