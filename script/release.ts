// Builds the GitHub release assets into release/:
//   glyph-engine-<os>-<arch>.tar.gz / .zip    the glyph-engine command (script/cli.ts), one per platform
//   glyph-engine-web.js                       @glyph-engine/web with core, one ES module for <script type="module">
//   glyph-engine-<package>-<version>.tgz      the npm tarballs
// Usage: bun script/release.ts [target...]    targets default to every platform below
// The release steps are in docs/releasing.md.
import { mkdir, rm } from 'fs/promises';
import { resolve } from 'path';

import { $ } from 'bun';

const root = resolve(import.meta.dir, '..');
const out = resolve(root, 'release');
// shortcut: the desktop runner is Linux only, so on macOS and Windows `glyph-engine desktop` says "not supported yet"
const all = ['linux-x64', 'linux-arm64', 'darwin-x64', 'darwin-arm64', 'windows-x64'];
const targets = process.argv.slice(2).length ? process.argv.slice(2) : all;

await rm(out, { recursive: true, force: true });
await mkdir(out);

for (const target of targets) {
    if (!all.includes(target)) throw new Error(`Unknown target ${target}; one of ${all.join(', ')}`);
    const name = `glyph-engine-${target}`;
    const dir = resolve(out, name);
    const exe = target.startsWith('windows') ? 'glyph-engine.exe' : 'glyph-engine';
    await $`bun build ${resolve(root, 'script/cli.ts')} --compile --minify --target=bun-${target} --outfile ${resolve(dir, exe)}`.quiet();
    await $`cp ${resolve(root, 'LICENSE')} ${dir}`;
    if (target.startsWith('windows')) await $`zip -qr ${name}.zip ${name}`.cwd(out);
    else await $`tar -czf ${name}.tar.gz ${name}`.cwd(out);
    await rm(dir, { recursive: true });

    console.log(`${name}`);
}

const web = await Bun.build({ entrypoints: [resolve(root, 'packages/web/src/index.ts')], target: 'browser', format: 'esm', minify: true, naming: 'glyph-engine-web.js', outdir: out });
if (!web.success) throw new AggregateError(web.logs, 'Building glyph-engine-web.js failed');

console.log('glyph-engine-web.js');

for (const pkg of ['core', 'web', 'tui', 'desktop']) {
    await $`bun run build`.cwd(resolve(root, 'packages', pkg)).quiet();
    await $`bun pm pack --destination ${out} --quiet`.cwd(resolve(root, 'packages', pkg));
}
