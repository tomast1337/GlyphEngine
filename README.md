# GlyphEngine

This is a fork of [play.core](https://github.com/ertdfgcvb/play.core)

with the added npm package support, and typescript support.

## Playground

```
bun run dev
```

Builds the examples and serves them at http://localhost:3000 (`PORT=4000 bun run dev` to change the port). Pick an example on the right, edit its source in the middle and press Ctrl+Enter to run it. `bun run build:examples` only builds the static files into `out/`.

## Writing programs

A program is a module that `run()` executes every frame. The classic API returns one cell per call:

```ts
import { run } from "glyph-engine";

run({
  main(coord, context) {
    return { char: "#", color: "red" }; // or just "#"
  },
});
```

### frame() programs (fast)

For large grids, export `frame()` instead: it fills the whole grid in one call, writing into typed arrays, with no function call or object per cell. When `frame()` is present, `pre()`, `main()` and `post()` are not called; `boot()` and the pointer events receive the frame.

```ts
import { run, rgba, cssColor, setChar, type Frame } from "glyph-engine";

run({
  frame(context, cursor, out: Frame) {
    const red = cssColor("red"); // packs once; reuse the number
    for (let k = 0; k < out.cols * out.rows; k++) {
      out.chars[k] = 0x23; // "#" as a code point
      out.fg[k] = red;
      out.bg[k] = rgba(0, 0, (k % 256), 255);
    }
    setChar(out, 0, "👩‍💻"); // glyphs made of several code points
  },
});
```

A `Frame` has, per cell (index `x + y * cols`):

| array | holds | 0 means |
|---|---|---|
| `chars` (`Uint32Array`) | Unicode code point; use `setChar()` / `getChar()` for multi-code-point glyphs | empty cell |
| `fg`, `bg` (`Uint32Array`) | colour as `0xRRGGBBAA`, from `rgba()` or `cssColor()` | `settings.color` / `settings.backgroundColor` |
| `weight` (`Uint8Array`) | font weight / 100 (7 = bold) | `settings.fontWeight` |

The frame keeps its content between frames (clear it yourself if needed) and is replaced on resize. Buffer helpers such as `drawBox()` and `drawInfo()` work on a frame through `asBuffer(frame)`. Examples: the "frame" group in the playground (`src/programs/frame/`) and `src/programs/demos/plasma.ts`.
