# Writing programs

A program is a module (or plain object) passed to `run()`. The engine calls its functions every frame, and a renderer (`text`, `canvas`, `webgl` or `webgpu`) draws the result as a grid of character cells.

Programs import from `@glyph-engine/core` (types, `drawbox`, `num`, `vec2`, `sdf`, colours), which works under any runner. Only programs using browser modules (`camera`, `canvas`, `sort`, `image`, `exportframe`…) import from `@glyph-engine/web`, and those run only in the browser.

In the terminal (`@glyph-engine/tui`), cells are taken to be twice as tall as wide (`context.metrics.aspect` is 0.5), the mouse is the cursor, and translucent colours draw opaque.

## main(): one call per cell

Like a fragment shader: `main()` runs once for every cell and writes that cell into `out`.

```ts
import { run } from '@glyph-engine/web';

run({
    main(coord, context, cursor, out, userData) {
        const v = Math.sin(coord.x * 0.1 + context.time * 0.001); // -1..1
        out.char = v > 0 ? '#' : '.';
        out.color = 'white'; // any CSS colour
        out.background.r = (v + 1) * 127; // or channels 0-255
        out.background.g = 0;
        out.background.b = 128;
    },
});
```

`coord` is the cell's position: `coord.x`, `coord.y` and `coord.index` (`x + y * cols`).

`out` is the cell. The engine resets it before each cell and stores it right after, so writing it allocates nothing:

| field            | holds                                       | starts as                                                              |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| `out.char`       | the glyph, a string (`"#"`, `"👋"`, `"👩‍💻"`) | `" "`                                                                  |
| `out.color`      | text colour                                 | the cell's colour last frame (`settings.color` at first)               |
| `out.background` | background colour                           | the cell's background last frame (`settings.backgroundColor` at first) |
| `out.fontWeight` | `"bold"`, `"700"`, `700` …                  | unset: keeps the cell's weight                                         |

Colours can be set three ways:

- a CSS string: `out.color = "tomato"`. Repeating the same string is cheap.
- a packed number: `out.color = rgba(255, 99, 71)`, or `cssColor("tomato")` computed once.
- channels: `out.color.r = 255`, `.g`, `.b`, `.a` (0-255). Values outside the range are clamped, so shader-style maths needs no clamping.

`out.color = 0` goes back to the settings colour.

## pre() and post()

Two optional functions run around the cells, once per frame:

- `pre(context, cursor, buffer, userData)`: before the cells. Compute values shared by every cell here (positions, rotations, colours) instead of recomputing them in each `main()` call; that took `sdf/rectangles` from 79 to 13 ms per frame.
- `post(context, cursor, buffer, userData)`: after the cells. Draw on top, e.g. `drawbox.drawInfo(context, cursor, buffer)` for the FPS box.

`buffer` is the grid seen as an array of cell objects (index `x + y * cols`), `{ char, color, backgroundColor, fontWeight }`. Reading it in `pre()` gives what `main()` wrote last frame (see `contributed/game_of_life`); assigning a whole cell writes it (`buffer[i] = { char: "#" }`). Each access converts one cell, and changing a cell object you read has no effect.

## Other functions and arguments

- `boot(context, buffer, userData)`: once, before the first frame.
- `pointerMove`, `pointerDown`, `pointerUp` `(context, cursor, buffer, userData)`: after a frame in which the pointer moved, was pressed or released.
- `keyDown` `(context, cursor, buffer, key, userData)`: after the frame, once per key pressed (key repeat too). `key` is `{ key, ctrlKey, altKey, shiftKey, metaKey }` with browser [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key) names (`'a'`, `'A'`, `'Enter'`, `'ArrowUp'`, `'F1'`...), the same in every runner. Use it instead of `window.addEventListener`, so the program also runs in the terminal and the desktop. Limits, as terminals can't do more: no key up, no modifier keys on their own, and keys as typed with the keyboard layout (no physical `code`). On the web, keys come from the whole page except form fields and editors; the browser's own shortcuts still run.
- `settings`: exported object merged over the `run()` settings, e.g. `{ fps: 60, renderer: "canvas", color: "white", backgroundColor: "black" }`.
- `context`: `frame`, `time` (ms), `delta` (ms since the previous frame), `cols`, `rows`, `width`, `height`, `metrics` (font metrics, `aspect` = cell width / height), `settings`.
- `cursor`: `x`, `y` in cells (fractional) and `pressed`.
- `userData`: the object passed as third argument to `run()`, `{}` by default. Shared by every call; a place for program state.

## Animating at any frame rate

The frame rate is not fixed: `settings.fps` is a cap, and a slow machine or a heavy program runs below it. Animation tied to the frame count (`context.frame`, "one row per frame") then slows down with it. Tie it to time instead:

- position from time: `x = speed * context.time / 1000`
- or step by the time since the last frame: `x += speed * context.delta / 1000`
- fading or decay per frame: `value *= Math.pow(perSecond, context.delta / 1000)`

`demos/rain` does both; change its `fps` setting and the rain keeps its speed. Simulations meant to advance one step per frame (`contributed/game_of_life`, `contributed/sand_game`) can keep using the frame count.

`delta` is 0 on the first frame. It is large after the tab was hidden (the browser pauses frames), so cap it if a jump would break something: `Math.min(context.delta, 100)`.

## main() on the GPU (WGSL)

A program can also export its `main()` in WGSL. With `renderer: "webgpu"` it runs on the GPU, one invocation per cell, and the JS `main()` is skipped. Without WebGPU the JS `main()` runs instead, so keep both. A program with only `wgsl` stops with an error, also in the terminal and desktop runners, which have no GPU path.

```ts
export const glyphs = ' .:-=+*#'; // every glyph the WGSL may draw
export const wgsl = /* wgsl */ `
fn main(coord: vec2f, ctx: Context, out: ptr<function, Cell>) {
  let v = sin(coord.x * 0.1 + ctx.time * 0.001) * 0.5 + 0.5; // 0..1
  out.char = glyph(u32(v * f32(GLYPHS)));
  out.color = vec4f(v, 0.5, 1.0 - v, 1.0);
}
`;
```

What the WGSL gets:

- `coord`: the cell, `x` and `y`.
- `ctx`: `time`, `delta` (ms), `frame`, `cols`, `rows`, `aspect`, `cursor` (`vec2f`, in cells), `pressed` (1 while down).
- `out`: `char` (a code point), `color` and `background` (`vec4f`, 0-1 per channel). It starts as a space in the settings colours.
- `glyph(i)`: the i-th glyph of `glyphs`, clamped to the last one; `GLYPHS` is their count.

Limits:

- Only glyphs listed in `glyphs` draw. Raw code points work if they are in that list.
- Glyphs outside the BMP (most emoji) and font weights other than the default draw nothing.
- No state between frames: the cells are written fresh every frame.

`pre()` and `post()` still run in JS. What they write into `buffer` is drawn on top of the GPU cells, e.g. the FPS box from `drawInfo()`.

Speed, `demos/plasma`, a full frame including the GPU finishing, on a Radeon RX 580:

| grid     | JS `main()` + webgl | WGSL + webgpu |
| -------- | ------------------- | ------------- |
| 300×100  | 5.7 ms              | 2.5 ms        |
| 500×200  | 18.0 ms             | 2.6 ms        |
| 1000×400 | 70.8 ms             | 3.3 ms        |

## Examples

- `basics/simple_output`, `basics/colors_and_weight`: the `out` fields.
- `demos/plasma`: colour channels, per-frame values in `pre()`, and the same `main()` in WGSL (pick WebGPU in the playground).
- `contributed/game_of_life`: reading last frame through the buffer.
- `demos/rain`: time-based animation with `delta`.
