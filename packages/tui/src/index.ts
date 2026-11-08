// The terminal runner: run() draws with ANSI 24-bit colour, the mouse is the
// cursor. Re-exports @glyph-engine/core. Runs on Bun and Node (see runtime.ts).
export * from '@glyph-engine/core';
export { parseKeys } from './keys';
export { createRenderer, rowString } from './renderer';
export { run } from './run';
export { run as default } from './run';
