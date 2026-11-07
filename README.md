# GlyphEngine

This is a fork of [play.core](https://github.com/ertdfgcvb/play.core)

with the added npm package support, and typescript support.

## Packages

- `@glyph-engine/core` (`packages/core`): frames, the `out` slot, `computeFrame()` and the modules programs use (`drawbox`, `num`, `vec2`, `sdf`…). No DOM: it runs anywhere.
- `@glyph-engine/web` (`packages/web`): `run()` in the browser with the text, canvas, WebGL2 and WebGPU renderers, and the browser-only modules (`camera`, `canvas`, `sort`, `image`…). It re-exports the core.
- `@glyph-engine/tui` (`packages/tui`): `run()` in a terminal, with 24-bit colour and the mouse as the cursor. Needs Bun. It re-exports the core.

The examples live in `programs/`. `bun run build` builds both packages into their `dist/`.

## Playground

```
bun run dev
```

Builds the examples and serves them at http://localhost:3000 (`PORT=4000 bun run dev` to change the port). Pick an example on the right, edit its source in the middle and press Ctrl+Enter to run it. `bun run build:examples` only builds the static files into `out/`.

## Terminal

```
bun run tui ./programs/demos/box_fun.ts
```

Runs a program file in the terminal; without a path, `demos/plasma`. Relative paths start at the repo root (`bun run` runs scripts there); absolute paths work from anywhere, and `@glyph-engine/*` imports in files outside the repo resolve to this repo's packages. Ctrl+C quits. Needs a terminal with 24-bit colour and mouse reporting (most do: kitty, WezTerm, Alacritty, GNOME Terminal, Windows Terminal). Programs that use browser modules (`camera`, `canvas`, `sort`…) only run in the browser.

## Writing programs

```ts
import { run } from '@glyph-engine/web';

run({
    main(coord, context, cursor, out) {
        out.char = '#';
        out.color = 'red';
    },
});
```

`main()` runs once per cell, like a fragment shader, and writes the cell into `out`. It can also be written in WGSL and run on the GPU with the `webgpu` renderer. See [docs/programs.md](docs/programs.md) for the whole API.
