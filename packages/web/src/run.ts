/**
Runner
*/

import { type Context, type Host, type Key, type Pointer, type PointerEventName, type Program, type Settings, startLoop, type State } from '@glyph-engine/core';

import canvasRenderer from './canvasrenderer';
import type { Render, RenderModes } from './renderer';
import storage from './storage';
import textRenderer from './textrenderer';
import webglRenderer from './webglrenderer';
import webgpuRenderer, { compileGpuProgram, type GpuStep, initWebGPU } from './webgpurenderer';

// Settings as the web runner sees them: the target is a DOM element.
export type WebSettings = Settings & { element: HTMLElement | HTMLCanvasElement | null };

const renderers: Record<RenderModes, Render> = {
    canvas: canvasRenderer,
    text: textRenderer,
    webgl: webglRenderer,
    webgpu: webgpuRenderer,
};

// Default settings for the program runner.
// They can be overwritten by the parameters of the runner
// or as a settings object exported by the program (in this order).
const defaultSettings = {
    element: null, // target element for output
    cols: 0, // number of columns, 0 is equivalent to 'auto'
    rows: 0, // number of columns, 0 is equivalent to 'auto'
    once: false, // if set to true the renderer will run only once
    fps: 30, // fps capping
    renderer: 'text', // can be 'canvas', anything else falls back to 'text'
    allowSelect: false, // allows selection of the rendered element
    restoreState: false, // will store the "state" object in local storage
    // this is handy for live-coding situations
} as unknown as WebSettings;

// CSS styles which can be passed to the container element via settings
const CSSStyles: (keyof WebSettings & keyof CSSStyleDeclaration)[] = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'textAlign'];
// Modifier keys alone: not sent, as terminals can't report them
const MODIFIERS = ['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock', 'Fn'];

// Program runner.
// Takes a program object (usually an imported module),
// and some optional settings (see above) as arguments.
// Finally, an optional userData object can be passed which will be available
// as last parameter in all the module functions.
// The program object should export at least a main(), pre() or post() function.
export function run(program: Program, runSettings: Partial<WebSettings> = {}, userData: object = {}) {
    // Everything is wrapped inside a promise;
    // in case of errors in ‘program’ it will reject without reaching the bottom.
    // If the program reaches the bottom of the first frame the promise is resolved.
    return new Promise<Context>(function (resolve, reject) {
        let started = false; // the first frame got through: later errors no longer reject
        // Merge of user- and default settings
        const settings = {
            ...defaultSettings,
            ...runSettings,
            ...program.settings,
        } as WebSettings; // program.settings cannot name a DOM element

        // Removes every listener and observer this run adds: on settings.signal, or after a once frame
        const stop = new AbortController();
        const listen = { signal: stop.signal };
        const abort = () => {
            stop.abort();
            reject(settings.signal!.reason); // no effect once the first frame resolved run()
        };
        if (settings.signal?.aborted) abort();
        settings.signal?.addEventListener('abort', abort, { once: true });

        // State is stored in local storage and will loaded on program launch
        // if settings.restoreState == true.
        // The purpose of this is to live edit the code without resetting
        // time and the frame counter.
        const state: State = {
            time: 0, // The time in ms
            frame: 0, // The frame number (int)
            cycle: 0, // An cycle count for debugging purposes
            fps: settings.fps, // The target fps
        };

        // Name of local storage key
        const LOCAL_STORAGE_KEY_STATE = 'currentState';

        if (settings.restoreState) {
            storage.restore(LOCAL_STORAGE_KEY_STATE, state);
            state.cycle++; // Keep track of the cycle count for debugging purposes
            // The loop stores at most once per second; save the latest state on leave
            addEventListener('pagehide', () => storage.store(LOCAL_STORAGE_KEY_STATE, state), listen);
        }

        // If element is not provided create a default element based
        // on the renderer settings.
        // Then choose the renderer:
        // If the parent element is a canvas the canvas renderer is selected,
        // for any other type a text node (PRE or any othe text node)
        // is expected and the text renderer is used.
        const renderer = renderers[settings.renderer] || renderers['text']!;
        if (!settings.element) {
            settings.element = document.createElement(renderer.preferredElementNodeName);
            document.body.appendChild(settings.element);
        } else if ((settings.element.nodeName == 'CANVAS') != (renderer.preferredElementNodeName == 'CANVAS')) {
            console.warn(`The "${settings.renderer}" renderer expects a ${renderer.preferredElementNodeName} target element.`);
        }

        // Apply CSS settings to element
        for (const s of CSSStyles) {
            const v = settings[s];
            if (v) settings.element.style[s] = v;
        }

        // Eventqueue
        // Stores events and pops them at the end of the renderloop
        // TODO: needed?
        const eventQueue: PointerEventName[] = [];

        // Input pointer updated by DOM events
        const pointer: Pointer = {
            x: 0,
            y: 0,
            pressed: false,
            px: 0,
            py: 0,
            ppressed: false,
        };

        settings.element.addEventListener(
            'pointermove',
            ((e: PointerEvent) => {
                const rect = settings.element?.getBoundingClientRect();
                if (!rect) return;
                pointer.x = e.clientX - rect.left;
                pointer.y = e.clientY - rect.top;
                eventQueue.push('pointerMove');
            }) as EventListenerOrEventListenerObject,
            listen,
        );

        settings.element.addEventListener(
            'pointerdown',
            ((e: PointerEvent) => {
                pointer.pressed = true;
                eventQueue.push('pointerDown');
            }) as EventListenerOrEventListenerObject,
            listen,
        );

        settings.element.addEventListener(
            'pointerup',
            ((e: PointerEvent) => {
                pointer.pressed = false;
                eventQueue.push('pointerUp');
            }) as EventListenerOrEventListenerObject,
            listen,
        );

        const touchHandler = ((e: TouchEvent) => {
            const rect = settings.element?.getBoundingClientRect();
            if (!rect) return;
            // changedTouches: on touchend for the last finger, touches is empty
            const touch = e.changedTouches[0]!;
            pointer.x = touch.clientX - rect.left;
            pointer.y = touch.clientY - rect.top;
            eventQueue.push('pointerMove');
        }) as EventListenerOrEventListenerObject;

        settings.element.addEventListener('touchmove', touchHandler, listen);
        settings.element.addEventListener('touchstart', touchHandler, listen);
        settings.element.addEventListener('touchend', touchHandler, listen);

        // Keys from the whole page (the element can't take focus), but not while typing in a form field or editor
        const keys: Key[] = [];
        if (typeof program.keyDown == 'function') {
            window.addEventListener(
                'keydown',
                (e) => {
                    const target = e.target as HTMLElement | null;
                    if (e.isComposing || MODIFIERS.includes(e.key) || target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.nodeName ?? '')) return;
                    keys.push({ key: e.key, ctrlKey: e.ctrlKey, altKey: e.altKey, shiftKey: e.shiftKey, metaKey: e.metaKey });
                },
                listen,
            );
        }

        // CSS fix
        settings.element.style.fontStretch = 'normal';

        // Text selection may be annoing in case of interactive programs
        if (!settings.allowSelect) disableSelect(settings.element);

        // Method to load a font via the FontFace object.
        // The load promise works 100% of the times.
        // But a definition of the font via CSS is preferable and more flexible.
        /*
		const CSSInfo = getCSSInfo(settings.element)
		var font = new FontFace('Simple Console', 'url(/css/fonts/simple/SimpleConsole-Light.woff)', { style: 'normal', weight: 400 })
		font.load().then(function(f) {
			...
		})
		*/

        // Metrics needs to be calculated before boot
        // Even with the "fonts.ready" the font may STILL not be loaded yet
        // on Safari 13.x and also 14.0.
        // A (shitty) workaround is to wait 3! rAF.
        // Submitted: https://bugs.webkit.org/show_bug.cgi?id=217047
        document.fonts.ready.then((e) => {
            // Run this three times...
            let count = 3;
            (function __run_thrice__() {
                if (stop.signal.aborted) return; // stopped before it booted
                if (--count > 0) {
                    requestAnimationFrame(__run_thrice__);
                } else {
                    // settings.element.style.lineHeight = Math.ceil(metrics.lineHeightf) + 'px'
                    // console.log(`Using font faimily: ${ci.fontFamily} @ ${ci.fontSize}/${ci.lineHeight}`)
                    // console.log(`Metrics: cellWidth: ${metrics.cellWidth}, lineHeightf: ${metrics.lineHeightf}`)
                    // Finally Boot!
                    prepareGpu().then(boot).catch(reject);
                }
            })();
            // Ideal mode:
            // metrics = calcMetrics(settings.element)
            // etc.
            // requestAnimationFrame(loop)
        });

        // Set when the program's WGSL main() runs on the GPU instead of main().
        let gpu: Omit<GpuStep, 'cursor'> | undefined;

        async function prepareGpu() {
            const device = settings.renderer == 'webgpu' ? await initWebGPU() : null; // null: not asked
            if (program.wgsl && device) {
                await compileGpuProgram(program.wgsl, program.glyphs ?? ' ');
                gpu = { wgsl: program.wgsl, glyphs: program.glyphs ?? ' ' };
            } else if (program.wgsl && typeof program.main != 'function') {
                throw new Error(device === false ? 'This program needs WebGPU, which this browser does not provide.' : 'This program runs on the GPU: set renderer: "webgpu".');
            }
        }

        function boot() {
            const el = settings.element as HTMLElement;
            // Element size, refreshed only on resize: reading it every frame forces layout
            let rect = el.getBoundingClientRect();
            const resize = new ResizeObserver(() => (rect = el.getBoundingClientRect()));
            resize.observe(el);
            stop.signal.addEventListener('abort', () => resize.disconnect(), { once: true });
            const host: Host = {
                requestFrame: (cb) =>
                    requestAnimationFrame((t) => {
                        try {
                            cb(t);
                        } catch (e) {
                            if (started) throw e; // as before: the loop stops, the console shows it
                            reject(e);
                        }
                    }),
                metrics: calcMetrics(el),
                size: () => rect,
                pointer,
                events: eventQueue,
                keys,
                render: (context, frame, cursor) => renderer.render(context, frame, gpu && { ...gpu, cursor }),
                onGpu: !!gpu,
                storeState: (state) => storage.store(LOCAL_STORAGE_KEY_STATE, state),
            };
            startLoop(program, settings, userData, state, host, (context) => {
                started = true;
                if (settings.once) stop.abort(); // the loop is done: input would only pile up
                resolve(context);
            });
        }
    });
}

// -- Helpers ------------------------------------------------------------------

// Disables selection for an HTML element
function disableSelect(el: HTMLElement) {
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none'; // for Safari on mac and iOS
    el.style.userSelect = 'none'; // for mobile FF
    el.dataset.selectionEnabled = 'false';
}

// Enables selection for an HTML element
function enableSelect(el: HTMLElement) {
    el.style.userSelect = 'auto';
    el.style.webkitUserSelect = 'auto';
    el.style.userSelect = 'auto';
    el.dataset.selectionEnabled = 'true';
}

// Copies the content of an element to the clipboard
export function copyContent(el: HTMLElement) {
    // Store selection default
    const selectionEnabled = !el.dataset.selectionEnabled === false;

    // Enable selection if necessary
    if (!selectionEnabled) enableSelect(el);

    // Copy the text block
    const range = document.createRange();
    range.selectNode(el);
    const sel = window.getSelection();
    if (!sel) throw new Error('Could not get selection');
    sel.removeAllRanges();
    sel.addRange(range);
    navigator.clipboard.writeText(el.innerText);
    sel.removeAllRanges();

    // Restore default, if necessary
    if (!selectionEnabled) disableSelect(el);
}

// Calcs width (fract), height, aspect of a monospaced char
// assuming that the CSS font-family is a monospaced font.
// Returns a mutable object.
export function calcMetrics(el: HTMLElement | HTMLCanvasElement) {
    const style = getComputedStyle(el);

    // Extract info from the style: in case of a canvas element
    // the style and font family should be set anyways.
    const fontFamily = style.getPropertyValue('font-family');
    const fontSize = parseFloat(style.getPropertyValue('font-size'));
    // Can’t rely on computed lineHeight since Safari 14.1
    // See:  https://bugs.webkit.org/show_bug.cgi?id=225695
    const lineHeight = parseFloat(style.getPropertyValue('line-height'));
    let cellWidth;

    // If the output element is a canvas 'measureText()' is used
    // else cellWidth is computed 'by hand' (should be the same, in any case)
    if (el.nodeName == 'CANVAS') {
        // Measure on a scratch canvas: a 2d context on the output canvas would
        // lock it to 2d and make getContext("webgl2") fail.
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) throw new Error('Could not get 2d context');
        ctx.font = fontSize + 'px ' + fontFamily;
        cellWidth = ctx.measureText(''.padEnd(50, 'X')).width / 50;
    } else {
        const span = document.createElement('span');
        el.appendChild(span);
        span.innerHTML = ''.padEnd(50, 'X');
        cellWidth = span.getBoundingClientRect().width / 50;
        el.removeChild(span);
    }

    const metrics = {
        aspect: cellWidth / lineHeight,
        cellWidth,
        lineHeight,
        fontFamily,
        fontSize,
        // Semi-hackish way to allow an update of the metrics object.
        // This may be useful in some situations, for example
        // responsive layouts with baseline or font change.
        // NOTE: It’s not an immutable object anymore
        _update: function () {
            const tmp = calcMetrics(el);
            for (var k in tmp) {
                // NOTE: Object.assign won’t work
                //if (typeof tmp[k] == "number" || typeof tmp[k] == "string") {
                //  m[k] = tmp[k];
                //}
            }
        },
    };

    return metrics;
}
