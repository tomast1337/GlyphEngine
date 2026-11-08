# @glyph-engine/desktop

[GlyphEngine](https://github.com/tomast1337/GlyphEngine) in a native window: `run()` draws through SDL3 with Vulkan, OpenGL, SDL GPU or a software renderer. No npm dependencies: SDL is linked with `bun:ffi`. Re-exports `@glyph-engine/core`.

Needs [Bun](https://bun.com), SDL3, SDL3_ttf and fontconfig. Linux only for now; macOS and Windows throw "not supported yet" (contributions welcome).

```
pacman -S sdl3 sdl3_ttf              # Arch
bun add @glyph-engine/desktop
```

```ts
import { run } from '@glyph-engine/desktop';

await run(
    {
        main(coord, context, cursor, out) {
            out.char = '#';
            out.color = 'red';
        },
    },
    { renderer: 'vulkan' }, // or opengl, opengles2, gpu, software; omit to let SDL choose
);
```

Escape or closing the window quits.
