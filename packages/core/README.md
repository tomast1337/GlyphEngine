# @glyph-engine/core

The platform-free core of [GlyphEngine](https://github.com/tomast1337/GlyphEngine): frames, the `out` slot, `computeFrame()` and the modules programs use (`drawbox`, `num`, `vec2`, `vec3`, `sdf`, `buffer`, `color`, `string`). No DOM; it runs anywhere.

You usually want a runner instead, which re-exports all of this:

- [`@glyph-engine/web`](https://www.npmjs.com/package/@glyph-engine/web): the browser
- [`@glyph-engine/tui`](https://www.npmjs.com/package/@glyph-engine/tui): the terminal (Bun)
- [`@glyph-engine/desktop`](https://www.npmjs.com/package/@glyph-engine/desktop): a native window (Bun, SDL3)

See [docs/programs.md](https://github.com/tomast1337/GlyphEngine/blob/main/docs/programs.md) for the program API.
