// Adds .js to the relative imports in the emitted .d.ts files ('./run' -> './run.js', a folder ->
// './modules/index.js'): Node's ESM resolution (TypeScript "nodenext") needs the extension.
// Usage: bun ../../script/fix-dts.ts dist     (run in a package, after tsc)
import { existsSync, statSync } from 'fs';
import { dirname, resolve } from 'path';

import { Glob } from 'bun';

const dist = resolve(process.argv[2] ?? 'dist');
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
