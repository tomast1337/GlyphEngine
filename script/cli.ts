// The glyph-engine command, compiled per platform for the GitHub release:
//   glyph-engine tui ./sketch.ts
//   glyph-engine desktop ./sketch.ts --renderer=vulkan
// The packages are built in; @glyph-engine/* imports in the sketch resolve to them.
import { resolve } from 'path';

import * as core from '@glyph-engine/core';
import * as desktop from '@glyph-engine/desktop';
import * as tui from '@glyph-engine/tui';
import { plugin } from 'bun';

const packages = { core, tui, desktop };
plugin({
    name: 'glyph-engine packages',
    setup(build) {
        for (const [name, exports] of Object.entries(packages)) build.module(`@glyph-engine/${name}`, () => ({ exports, loader: 'object' }));
    },
});

const usage = 'Usage: glyph-engine <tui|desktop> <file> [--renderer=name]';
const [target, ...args] = process.argv.slice(2);
const runner = target === 'tui' || target === 'desktop' ? packages[target] : undefined;
const path = args.find((a) => !a.startsWith('--'));
if (target === '--version' || target === '-v') {
    console.log(core.RUNNER_VERSION);
    process.exit(0);
}
if (!runner || !path) {
    console.error(usage);
    process.exit(1);
}
const file = resolve(path);
if (!(await Bun.file(file).exists())) {
    console.error(`No such file: ${file}`);
    process.exit(1);
}
const renderer = args.find((a) => a.startsWith('--renderer='))?.slice('--renderer='.length);
await runner.run(await import(file), renderer ? { renderer } : {});
