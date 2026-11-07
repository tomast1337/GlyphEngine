import { expect, test } from "bun:test";
import textRenderer from "../src/core/textrenderer";
import type { Context } from "../src/modules/types";

// Minimal fake of the DOM bits the text renderer touches.
function fakeElement() {
  const childNodes: any[] = [];
  return {
    childNodes,
    get childElementCount() { return childNodes.length; },
    get lastChild() { return childNodes[childNodes.length - 1]; },
    appendChild: (n: any) => childNodes.push(n),
    removeChild: (n: any) => childNodes.splice(childNodes.indexOf(n), 1),
  };
}
(globalThis as any).document = { createElement: () => ({ style: {}, innerHTML: "" }) };

const row = (s: string) => [...s].map((char) => ({ char }));
const ctx = (element: any) => ({ cols: 2, rows: 1, settings: { element } }) as unknown as Context;

test("text renderer keeps a separate back buffer per element", () => {
  const a = fakeElement();
  const b = fakeElement();
  textRenderer.render(ctx(a), row("aa") as any);
  textRenderer.render(ctx(b), row("bb") as any);
  textRenderer.render(ctx(a), row("bb") as any);
  expect(a.childNodes[0].innerHTML).toBe("bb");
});
