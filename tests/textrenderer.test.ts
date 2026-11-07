import { expect, test } from "bun:test";
import textRenderer from "../src/core/textrenderer";
import type { Context } from "../src/modules/types";
import { createFrame, setChar } from "../src/core/frame";

// Minimal fake of the DOM bits the text renderer touches.
type FakeNode = { style: object; innerHTML: string };
function fakeElement() {
  const childNodes: FakeNode[] = [];
  return {
    childNodes,
    get childElementCount() { return childNodes.length; },
    get lastChild() { return childNodes[childNodes.length - 1]; },
    appendChild: (n: FakeNode) => childNodes.push(n),
    removeChild: (n: FakeNode) => childNodes.splice(childNodes.indexOf(n), 1),
  };
}
Object.assign(globalThis, { document: { createElement: (): FakeNode => ({ style: {}, innerHTML: "" }) } });

const row = (s: string) => {
  const f = createFrame(s.length, 1);
  [...s].forEach((c, i) => setChar(f, i, c));
  return f;
};
const ctx = (element: ReturnType<typeof fakeElement>) => ({ cols: 2, rows: 1, settings: { element } }) as unknown as Context;

test("text renderer keeps a separate back buffer per element", () => {
  const a = fakeElement();
  const b = fakeElement();
  textRenderer.render(ctx(a), row("aa"));
  textRenderer.render(ctx(b), row("bb"));
  textRenderer.render(ctx(a), row("bb"));
  expect(a.childNodes[0]!.innerHTML).toBe("bb");
});
