# @glyph-engine/tui

[GlyphEngine](https://github.com/tomast1337/GlyphEngine) in the terminal: `run()` draws with 24-bit colour, and the mouse is the cursor. Runs on [Bun](https://bun.com) and Node 22+, in a terminal with truecolor and mouse reporting. Re-exports `@glyph-engine/core`.

```
bun add @glyph-engine/tui   # or: npm install @glyph-engine/tui
```

```ts
import { run } from '@glyph-engine/tui';

await run({
    main(coord, context, cursor, out) {
        out.char = '#';
        out.color = 'red';
    },
});
```

Ctrl+C quits. Programs that use browser modules (`camera`, `canvas`, `sort`…) only run on the web.

`parseKeys(text)` turns raw terminal input into keys with browser names (`'a'`, `'Enter'`, `'ArrowUp'`, plus `ctrlKey` / `altKey` / `shiftKey` / `metaKey`). It returns `{ keys, rest }`; `rest` is an escape sequence cut off at the end, to put in front of the next read.
