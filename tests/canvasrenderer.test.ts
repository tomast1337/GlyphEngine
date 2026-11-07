import { expect, test } from "bun:test";
import canvasRenderer from "../src/core/canvasrenderer";
import type { Context } from "../src/modules/types";

// Fake 2d context: records ctx.font at every fillText.
function fakeCanvas() {
  const fonts: string[] = [];
  const ctx: any = {
    font: "",
    fillRect() {},
    save() {},
    restore() {},
    scale() {},
    translate() {},
    measureText: () => ({ width: 8 }),
    fillText() {
      fonts.push(ctx.font);
    },
  };
  return { fonts, canvas: { style: {}, getContext: () => ctx } };
}

test("canvas renderer uses settings.fontWeight for cells without their own", () => {
  (globalThis as any).devicePixelRatio = 1;
  const { fonts, canvas } = fakeCanvas();
  const context = {
    cols: 2,
    rows: 1,
    width: 16,
    height: 16,
    metrics: { cellWidth: 8, lineHeight: 16, fontSize: 16, fontFamily: "monospace" },
    settings: { element: canvas, color: "white", fontWeight: "700" },
  } as unknown as Context;

  canvasRenderer.render(context, [{ char: "A" }, { char: "B", fontWeight: "100" }] as any);

  expect(fonts).toEqual(["700 16px monospace", "100 16px monospace"]);
});

test("canvas renderer gives wide glyphs two cells, pushing the row right", () => {
  (globalThis as any).devicePixelRatio = 1;
  const drawn: [string, number][] = [];
  const ctx: any = {
    font: "",
    fillRect() {},
    save() {},
    restore() {},
    scale() {},
    translate() {},
    measureText: (s: string) => ({ width: s === "🌮" ? 16 : 8 }),
    fillText: (s: string, x: number) => drawn.push([s, x]),
  };
  const context = {
    cols: 3,
    rows: 1,
    width: 24,
    height: 16,
    metrics: { cellWidth: 8, lineHeight: 16, fontSize: 16, fontFamily: "monospace" },
    settings: { element: { style: {}, getContext: () => ctx } },
  } as unknown as Context;

  canvasRenderer.render(context, [{ char: "🌮" }, { char: "A" }, { char: "B" }] as any);

  expect(drawn).toEqual([["🌮", 0], ["A", 16]]); // "B" no longer fits
});
