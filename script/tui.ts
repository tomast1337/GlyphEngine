// Runs an example in the terminal: bun run tui [demos/plasma]   (Ctrl+C quits)
import { run } from '@glyph-engine/tui';

const name = process.argv[2] ?? 'demos/plasma';
await run(await import(`../programs/${name}.ts`));
