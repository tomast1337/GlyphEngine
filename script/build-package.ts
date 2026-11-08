// Builds the package in the current directory into dist/, in code so it runs the same on any OS:
//   1. dist/index.js: src/index.ts bundled by Bun for --target (browser, node or bun);
//      the package's dependencies (@glyph-engine/core) stay imports
//   2. dist/**/*.d.ts: declarations from tsc (tsconfig.build.json)
//   3. .js added to their relative imports ('./run' -> './run.js'), which Node's ESM
//      resolution (TypeScript "nodenext") needs
//   4. LICENSE copied from the repo root, for the npm tarball
// Usage, in a package's package.json: "build": "bun ../../script/build-package.ts --target=node"
import { existsSync, statSync } from 'fs';
import { copyFile, rm } from 'fs/promises';
import { dirname, resolve } from 'path';

import { $, Glob } from 'bun';

const target = process.argv.find((a) => a.startsWith('--target='))?.slice('--target='.length);
if (target !== 'browser' && target !== 'node' && target !== 'bun') throw new Error('Usage: bun build-package.ts --target=browser|node|bun');

const dist = resolve('dist');
const pkg = await Bun.file('package.json').json();

await rm(dist, { recursive: true, force: true });

const result = await Bun.build({ entrypoints: ['src/index.ts'], outdir: dist, target, external: Object.keys(pkg.dependencies ?? {}) });
if (!result.success) throw new AggregateError(result.logs, `Building ${pkg.name} failed`);

await $`${process.execPath} x tsc -p tsconfig.build.json`;

const RELATIVE = /(\bfrom\s+|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*?)\2/g;
for (const file of new Glob('**/*.d.ts').scanSync(dist)) {
    const path = resolve(dist, file);
    const text = await Bun.file(path).text();
    const fixed = text.replace(RELATIVE, (_, before, quote, spec: string) => {
        if (spec.endsWith('.js')) return before + quote + spec + quote;
        const target = resolve(dirname(path), spec);
        const isDir = existsSync(target) && statSync(target).isDirectory();
        return before + quote + spec + (isDir ? '/index.js' : '.js') + quote;
    });
    if (fixed !== text) await Bun.write(path, fixed);
}

await copyFile(resolve(import.meta.dir, '../LICENSE'), 'LICENSE');
