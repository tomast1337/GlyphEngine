// The desktop runner: run() opens a native window and draws through SDL3 (OpenGL,
// Vulkan, SDL GPU or software), linked with bun:ffi. Linux for now. Needs Bun,
// SDL3, SDL3_ttf and fontconfig. Re-exports @glyph-engine/core.
export * from '@glyph-engine/core';
export { renderDrivers } from './sdl';
export { run } from './run';
export { run as default } from './run';
