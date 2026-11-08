// Packs the built packages (run `bun run build` first), installs the tarballs with npm into a
// temp project and typechecks an import of each under nodenext and bundler resolution.
// Usage: bun script/check-types.ts
import { mkdtemp, readdir, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

import { $ } from 'bun';

const root = resolve(import.meta.dir, '..');
const dir = await mkdtemp(join(tmpdir(), 'glyph-types-'));

// A broken .d.ts makes run() missing or any: missing errors, any trips the implicit-any params and the unused @ts-expect-error.
const check = `import { type Program, createFrame } from '@glyph-engine/core';
import { run as desktop } from '@glyph-engine/desktop';
import { run as tui } from '@glyph-engine/tui';
import { run as web } from '@glyph-engine/web';

const program: Program = { main(coord, context, cursor, out) { out.char = coord.x > cursor.x ? '#' : ' '; } };
createFrame(1, 1);
web({ main(coord, context, cursor, out) { out.char = coord.x > cursor.x ? '#' : ' '; } });
tui({ main(coord, context, cursor, out) { out.char = coord.x > cursor.x ? '#' : ' '; } });
desktop(program);
// @ts-expect-error run() takes a program
tui(42);
`;

try {
    for (const pkg of ['core', 'web', 'tui', 'desktop']) await $`bun pm pack --destination ${dir} --quiet`.cwd(resolve(root, 'packages', pkg));
    const tarballs = (await readdir(dir)).filter((f) => f.endsWith('.tgz')).map((f) => `./${f}`);
    await $`npm install --silent --no-audit --no-fund ${tarballs}`.cwd(dir);
    await writeFile(join(dir, 'check.mts'), check);
    for (const [module, resolution] of [
        ['nodenext', 'nodenext'],
        ['preserve', 'bundler'],
    ]) {
        await $`${process.execPath} x tsc --noEmit --strict --skipLibCheck --lib esnext,dom --module ${module} --moduleResolution ${resolution} ${join(dir, 'check.mts')}`.cwd(root);
        console.log(`types ok under ${resolution}`);
    }
} finally {
    await rm(dir, { recursive: true, force: true });
}
