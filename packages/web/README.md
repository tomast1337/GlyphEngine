# @glyph-engine/web

[GlyphEngine](https://github.com/tomast1337/GlyphEngine) in the browser: `run()` with the text, canvas, WebGL2 and WebGPU renderers, plus the browser-only modules (`camera`, `canvas`, `sort`, `image`…). Re-exports `@glyph-engine/core`.

```
npm install @glyph-engine/web
```

```ts
import { run } from '@glyph-engine/web';

run({
    main(coord, context, cursor, out) {
        out.char = '#';
        out.color = 'red';
    },
});
```

See [docs/programs.md](https://github.com/tomast1337/GlyphEngine/blob/main/docs/programs.md) for the program API.
