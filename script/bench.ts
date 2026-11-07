// Engine benchmark: runs programs in headless Chromium and prints ms per frame.
// Usage: bun run bench [frames] [cols] [rows]
import { chromium } from "playwright";

const FRAMES = Number(process.argv[2] ?? 200);
const COLS = Number(process.argv[3] ?? 200);
const ROWS = Number(process.argv[4] ?? 60);
const WARMUP = 20;

const build = await Bun.build({ entrypoints: [import.meta.dir + "/bench-page.ts"], target: "browser" });
if (!build.success) throw new AggregateError(build.logs, "bench bundle failed");
const script = await build.outputs[0]!.text();

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; font: 16px/20px monospace; }
  pre { margin: 0; }
  pre, canvas { display: block; width: ${COLS * 10}px; height: ${ROWS * 20}px; }
</style></head><body></body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: COLS * 10, height: ROWS * 20 } });
  page.on("pageerror", (e) => console.error("page error:", e.message));
  // A real origin, so localStorage behaves as on a live site
  await page.route("http://bench.local/", (r) => r.fulfill({ contentType: "text/html", body: html }));
  await page.goto("http://bench.local/");
  await page.addScriptTag({ content: script });
  const results = await page.evaluate(
    ([c, r, f, w]) => (window as any).bench(c, r, f, w),
    [COLS, ROWS, FRAMES, WARMUP]
  );

  console.log(`${COLS}x${ROWS}, ${FRAMES} frames (${WARMUP} warmup), mean ms/frame\n`);
  console.log("program".padEnd(10) + "compute".padStart(10) + "canvas".padStart(10) + "webgl".padStart(10) + "text".padStart(10));
  for (const [name, r] of Object.entries(results as Record<string, Record<string, number>>)) {
    console.log(name.padEnd(10) + [r.compute, r.canvas, r.webgl, r.text].map((n) => n!.toFixed(2).padStart(10)).join(""));
  }
  console.log("\ncanvas/webgl/text = full engine frame (getContext, storage, compute, render),");
  console.log("measured as JS time; the browser lays out and paints between frames, untimed.");
} finally {
  await browser.close();
}
