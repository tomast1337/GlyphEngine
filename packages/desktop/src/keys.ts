/**
@module   keys
@desc     SDL key events to browser key names
@category desktop
*/

import type { Key } from '@glyph-engine/core';

// SDL keycodes without a character (SDLK_* = scancode | 0x40000000)
const SPECIAL: Record<number, string> = {
    0x0d: 'Enter',
    0x1b: 'Escape',
    0x08: 'Backspace',
    0x09: 'Tab',
    0x7f: 'Delete',
    0x40000049: 'Insert',
    0x4000004a: 'Home',
    0x4000004b: 'PageUp',
    0x4000004d: 'End',
    0x4000004e: 'PageDown',
    0x4000004f: 'ArrowRight',
    0x40000050: 'ArrowLeft',
    0x40000051: 'ArrowDown',
    0x40000052: 'ArrowUp',
    0x40000058: 'Enter', // keypad
};
for (let i = 0; i < 12; i++) SPECIAL[0x4000003a + i] = 'F' + (i + 1);

export const KMOD_SHIFT = 0x0003;
export const KMOD_CAPS = 0x2000;

/**
`keycode`: the key with the layout and Shift / Caps Lock applied (SDL_GetKeyFromScancode
with key_event false); `mod`: the event's SDL_Keymod. Undefined for keys a terminal could
not send either (modifiers alone, media keys...).
*/
export function keyFrom(keycode: number, mod: number): Key | undefined {
    const name = SPECIAL[keycode] ?? (keycode >= 0x20 && keycode < 0x40000000 ? String.fromCodePoint(keycode) : undefined);
    if (!name) return undefined;
    return { key: name, shiftKey: !!(mod & KMOD_SHIFT), ctrlKey: !!(mod & 0x00c0), altKey: !!(mod & 0x0300), metaKey: !!(mod & 0x0c00) };
}
