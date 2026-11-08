// Runs a program file in the terminal or a desktop window:
//   bun run tui ./programs/demos/box_fun.ts           relative to the repo root (bun run starts there)
//   bun run desktop ~/sketches/mine.ts                 any file; @glyph-engine/* imports resolve to this repo
//   bun run desktop --renderer=software                the desktop backend: vulkan, opengl, gpu, software...
//   bun run tui                                        no file: demos/plasma
// Ctrl+C quits the terminal; closing the window or Escape quits the desktop.
import { resolve } from 'path';

import { plugin } from 'bun';

// Files outside the repo don't see its tsconfig paths, and Bun's runtime plugins can't
// redirect imports: rewrite @glyph-engine/* in those files to the sources here.
const root = resolve(import.meta.dir, '..');
const outside = new RegExp(`^(?!${root.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}/).*\\.[cm]?[jt]sx?$`);
plugin({
    name: 'glyph-engine sources',
    setup(build) {
        build.onLoad({ filter: outside }, async (args) => ({
            loader: /x$/.test(args.path) ? 'tsx' : 'ts',
            contents: (await Bun.file(args.path).text()).replace(/(['"])@glyph-engine\/(core|web|tui|desktop)\1/g, (_, q, name) => q + resolve(root, 'packages', name, 'src/index.ts') + q),
        }));
    },
});

const [target, ...args] = process.argv.slice(2);
const runner = target === 'desktop' ? await import('@glyph-engine/desktop') : target === 'tui' ? await import('@glyph-engine/tui') : undefined;
if (!runner) {
    console.error('Usage: bun script/native.ts <tui|desktop> [file] [--renderer=name]');
    process.exit(1);
}
const renderer = args.find((a) => a.startsWith('--renderer='))?.slice('--renderer='.length);
const path = args.find((a) => !a.startsWith('--'));
const file = resolve(path ?? resolve(import.meta.dir, '../programs/demos/plasma.ts'));
if (!(await Bun.file(file).exists())) {
    console.error(`No such file: ${file}`);
    process.exit(1);
}
await runner.run(await import(file), renderer ? { renderer } : {});
