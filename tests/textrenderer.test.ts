import { afterAll, expect, test } from 'bun:test';

import { createFrame, setChar } from '@glyph-engine/core';
import type { Context } from '@glyph-engine/core';

import textRenderer from '../packages/web/src/textrenderer';

// Minimal fake of the DOM bits the text renderer touches.
type FakeNode = { style: object; innerHTML: string };
function fakeElement() {
    const childNodes: FakeNode[] = [];
    return {
        childNodes,
        get childElementCount() {
            return childNodes.length;
        },
        get lastChild() {
            return childNodes[childNodes.length - 1];
        },
        appendChild: (n: FakeNode) => childNodes.push(n),
        removeChild: (n: FakeNode) => childNodes.splice(childNodes.indexOf(n), 1),
    };
}
Object.assign(globalThis, {
    document: { createElement: (): FakeNode => ({ style: {}, innerHTML: '' }) },
});
// Other test files share this global: a leftover fake breaks cssColor() there.
afterAll(() => {
    delete (globalThis as { document?: unknown }).document;
});

const row = (s: string) => {
    const f = createFrame(s.length, 1);
    [...s].forEach((c, i) => setChar(f, i, c));
    return f;
};
const ctx = (element: ReturnType<typeof fakeElement>) => ({ cols: 2, rows: 1, settings: { element } }) as Context;

test('text renderer keeps a separate back buffer per element', () => {
    const a = fakeElement();
    const b = fakeElement();
    textRenderer.render(ctx(a), row('aa'));
    textRenderer.render(ctx(b), row('bb'));
    textRenderer.render(ctx(a), row('bb'));
    expect(a.childNodes[0]!.innerHTML).toBe('bb');
});

test('text renderer escapes glyphs as text', () => {
    const el = fakeElement();
    const s = '<img src=x onerror=alert(1)>&';
    textRenderer.render(ctx(el), row(s));
    expect(el.childNodes[0]!.innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;&amp;');

    // A multi-code-point glyph is stored whole, so it can hold markup too.
    const f = createFrame(1, 1);
    setChar(f, 0, '<b>');
    textRenderer.render(ctx(el), f);
    expect(el.childNodes[0]!.innerHTML).toBe('&lt;b&gt;');
});
