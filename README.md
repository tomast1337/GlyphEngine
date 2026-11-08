# GlyphEngine

This is a fork of [play.core](https://github.com/ertdfgcvb/play.core)

with the added npm package support, and typescript support.

## Install

```
bun add @glyph-engine/web       # browser
bun add @glyph-engine/tui       # terminal (Bun or Node)
bun add @glyph-engine/desktop   # native window (Bun, Linux, SDL3)
```

Each runner re-exports `@glyph-engine/core`, so one import is enough. `npm install` works too for `core`, `web` and `tui` (Node 22+); `desktop` needs Bun.

Or, without Bun or npm, download from [Releases](https://github.com/tomast1337/GlyphEngine/releases):

- `glyph-engine-<os>-<arch>`: the `glyph-engine` command with the packages built in. Run `glyph-engine tui sketch.ts` or `glyph-engine desktop sketch.ts --renderer=vulkan` (desktop: Linux only for now).
- `glyph-engine-web.js`: the browser runner and core in one ES module, for `<script type="module">`.

## Packages

- `@glyph-engine/core` (`packages/core`): frames, the `out` slot, `computeFrame()` and the modules programs use (`drawbox`, `num`, `vec2`, `sdf`…). No DOM: it runs anywhere.
- `@glyph-engine/web` (`packages/web`): `run()` in the browser with the text, canvas, WebGL2 and WebGPU renderers, and the browser-only modules (`camera`, `canvas`, `sort`, `image`…). It re-exports the core.
- `@glyph-engine/tui` (`packages/tui`): `run()` in a terminal, with 24-bit colour and the mouse as the cursor. Runs on Bun and Node. It re-exports the core.
- `@glyph-engine/desktop` (`packages/desktop`): `run()` in a native window through SDL3 (Vulkan, OpenGL, SDL GPU or software), linked with `bun:ffi`. Needs Bun, SDL3, SDL3_ttf and fontconfig; Linux for now. It re-exports the core.

The examples live in `programs/`. `bun run build` builds every package into their `dist/`.

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

## Desktop

```
bun run desktop ./programs/demos/box_fun.ts --renderer=vulkan
```

Same paths as the terminal. `--renderer` picks SDL's backend (`vulkan`, `opengl`, `opengles2`, `gpu`, `software`); without it SDL chooses. Escape (unless the program has `keyDown`) or closing the window ends the run; the process exits once nothing else keeps it going. Needs SDL3 and SDL3_ttf from your distro (Arch: `pacman -S sdl3 sdl3_ttf`).

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

To stop a run, pass an `AbortSignal` in the settings: `run(program, { signal })`. Aborting stops the frames and releases what the runner set up (listeners on the page, the terminal modes, the window). In every runner.
