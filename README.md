# GlyphEngine

This is a fork of [play.core](https://github.com/ertdfgcvb/play.core)

with the added npm package support, and typescript support.

## Playground

```
bun run dev
```

Builds the examples and serves them at http://localhost:3000 (`PORT=4000 bun run dev` to change the port). Pick an example on the right, edit its source in the middle and press Ctrl+Enter to run it. `bun run build:examples` only builds the static files into `out/`.

## Writing programs

```ts
import { run } from "glyph-engine";

run({
  main(coord, context, cursor, out) {
    out.char = "#";
    out.color = "red";
  },
});
```

`main()` runs once per cell, like a fragment shader, and writes the cell into `out`. It can also be written in WGSL and run on the GPU with the `webgpu` renderer. See [docs/programs.md](docs/programs.md) for the whole API.
