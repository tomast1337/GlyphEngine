// Runs a program file in the terminal (Ctrl+C quits):
//   bun run tui ./programs/demos/box_fun.ts    relative to the repo root (bun run starts there)
//   bun run tui ~/sketches/mine.ts             any file; @glyph-engine/* imports resolve to this repo
//   bun run tui                                demos/plasma
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
            contents: (await Bun.file(args.path).text()).replace(/(['"])@glyph-engine\/(core|web|tui)\1/g, (_, q, name) => q + resolve(root, 'packages', name, 'src/index.ts') + q),
        }));
    },
});

const { run } = await import('@glyph-engine/tui');
const file = resolve(process.argv[2] ?? resolve(import.meta.dir, '../programs/demos/plasma.ts'));
if (!(await Bun.file(file).exists())) {
    console.error(`No such file: ${file}`);
    process.exit(1);
}
await run(await import(file));
