# Writing programs

A program is a module (or plain object) passed to `run()`. The engine calls its functions every frame, and a renderer (`text`, `canvas` or `webgl`) draws the result as a grid of character cells.

There are two ways to fill the grid:

- **`main()`**: called once per cell; returns that cell. Simple, and the style of the original play.core.
- **`frame()`**: called once per frame; writes every cell into typed arrays. More verbose, much faster on big grids.

A program uses one or the other. If it exports `frame()`, then `pre()`, `main()` and `post()` are ignored.

## main(): one call per cell

```ts
import { run } from "glyph-engine";

run({
  main(coord, context, cursor, buffer, userData) {
    return { char: "#", color: "red" }; // or just "#"
  },
});
```

`main()` receives the cell's position (`coord.x`, `coord.y`, `coord.index`) and returns one of:

- a string: the glyph (`"#"`, `"👋"`)
- a cell object: `{ char, color, backgroundColor, fontWeight }`, colours as any CSS string
- nothing (`undefined` / `null`): an empty cell

Two optional functions run around it, once per frame:

- `pre(context, cursor, buffer, userData)`: before the cells. Compute values shared by every cell here (positions, rotations, colours) instead of recomputing them in each `main()` call.
- `post(context, cursor, buffer, userData)`: after the cells. Draw on top, e.g. `drawbox.drawInfo(context, cursor, buffer)` for the FPS box.

`buffer` is the grid as an array of cell objects (index `x + y * cols`). It keeps its cells between frames, so `pre()` can read the previous frame (see `contributed/game_of_life`). `main()` overwrites every cell each frame.

## frame(): one call per frame

```ts
import { run, rgba, cssColor, setChar, type Frame } from "glyph-engine";

const red = cssColor("red"); // pack colours once, reuse the number

run({
  frame(context, cursor, out: Frame, userData) {
    for (let k = 0; k < out.cols * out.rows; k++) {
      out.chars[k] = 0x23; // "#" as a code point
      out.fg[k] = red;
      out.bg[k] = rgba(0, 0, k % 256);
    }
    setChar(out, 0, "👩‍💻"); // a glyph made of several code points
  },
});
```

`out` holds the grid as typed arrays, one entry per cell, index `k = x + y * cols`:

| array | holds | 0 means |
|---|---|---|
| `chars` (`Uint32Array`) | the glyph as a Unicode code point | empty cell |
| `fg` (`Uint32Array`) | text colour, packed `0xRRGGBBAA` | `settings.color` |
| `bg` (`Uint32Array`) | background colour | `settings.backgroundColor` |
| `weight` (`Uint8Array`) | font weight / 100 (7 = bold) | `settings.fontWeight` |

Helpers:

- `rgba(r, g, b, a = 255)`: pack channels (0-255) into a colour.
- `cssColor("tomato")`: pack any CSS colour (cached). Call it once, outside the loop.
- `setChar(out, k, s)` / `getChar(out, k)`: write / read a glyph as a string. Needed for glyphs made of several code points (ZWJ emoji, flags); single code points can go straight into `chars`.
- `asBuffer(out)`: the frame seen as a buffer of cell objects, so buffer helpers work on it: `drawbox.drawInfo(context, cursor, asBuffer(out))`. Each access converts one cell: fine for a box or a line of text, slow for the whole grid.

The frame keeps its content: cells you don't write keep last frame's value (see `frame/rain`). It is replaced by a fresh, empty one when the grid is resized.

## Both APIs

These work the same way with `main()` and `frame()` programs:

- `boot(context, buffer, userData)`: once, before the first frame. Receives the buffer, or the frame for `frame()` programs.
- `pointerMove`, `pointerDown`, `pointerUp` `(context, cursor, buffer, userData)`: after a frame in which the pointer moved, was pressed or released.
- `settings`: exported object merged over the `run()` settings, e.g. `{ fps: 60, renderer: "canvas", color: "white", backgroundColor: "black" }`.
- `context`: `frame`, `time` (ms), `cols`, `rows`, `width`, `height`, `metrics` (font metrics, `aspect` = cell width / height), `settings`.
- `cursor`: `x`, `y` in cells (fractional) and `pressed`.
- `userData`: the object passed as third argument to `run()`, `{}` by default. Shared by every call; a place for program state.

## How they differ

| | `main()` | `frame()` |
|---|---|---|
| called | once per cell | once per frame |
| glyph | string | code point (`setChar()` for strings) |
| colour | CSS string per cell | packed number, packed once |
| per-frame values | computed in `pre()` | computed before the cell loop |
| cells not written | every cell is written each frame | keep last frame's value |
| drawing helpers | take the buffer directly | through `asBuffer(out)` |
| cost per cell | a call, a cell object, then a conversion to the renderers' format | an array write |

Under the hood both end in the same place: renderers draw the typed-array frame. A `main()` program's buffer is converted into it after `post()`.

## Which one to use

Start with `main()`: it reads like a fragment shader and is enough for most programs. Most examples in the playground use it.

Use `frame()` when the grid is big or the maths per cell heavy and the frame rate drops. The API overhead of `main()` is roughly 1-2 ms per frame at 300×100 cells. If a `main()` program is much slower than that, first move the values that are the same for every cell into `pre()` (that took `sdf/rectangles` from 79 to 13 ms); `frame()` then saves the rest.

## Examples

- `main()`: most of the playground, e.g. `basics/simple_output`, `sdf/balls`, `contributed/game_of_life`.
- `frame()`: the **frame** group (`hello_frame`, `colors_and_weight`, `balls`, `rain`) and `demos/plasma`. `frame/balls` and `sdf/balls` draw the same picture, one with each API.
