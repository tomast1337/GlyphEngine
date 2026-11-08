# @glyph-engine/tui

[GlyphEngine](https://github.com/tomast1337/GlyphEngine) in the terminal: `run()` draws with 24-bit colour, and the mouse is the cursor. Needs [Bun](https://bun.com) and a terminal with truecolor and mouse reporting. Re-exports `@glyph-engine/core`.

```
bun add @glyph-engine/tui
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
