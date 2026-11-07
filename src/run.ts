/**
Runner
*/

// Available renderers
import textRenderer from "./core/textrenderer";
import canvasRenderer from "./core/canvasrenderer";
import webglRenderer from "./core/webglrenderer";
import FPS from "./core/fps";
import storage from "./core/storage";
import RUNNER_VERSION from "./core/version";
import { asBuffer, createFrame, cssColor, getChar, setChar, weightCode, type Frame } from "./core/frame";
import { CellOut } from "./core/out";
import type { Buffer } from "./modules/buffer";
import type { CellValue } from "./program";
import type { Context, Cursor, Metrics, Pointer, Program, Settings, State } from "./program";
import type{ RenderModes } from "./core";

export { RUNNER_VERSION };

const renderers: Record<
  RenderModes,
  typeof textRenderer | typeof canvasRenderer
> = {
  canvas: canvasRenderer,
  text: textRenderer,
  webgl: webglRenderer,
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
  renderer: "text", // can be 'canvas', anything else falls back to 'text'
  allowSelect: false, // allows selection of the rendered element
  restoreState: false, // will store the "state" object in local storage
  // this is handy for live-coding situations
} as unknown as Settings;

// CSS styles which can be passed to the container element via settings
const CSSStyles: (keyof Settings & keyof CSSStyleDeclaration)[] = [
  "backgroundColor",
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "textAlign",
];

// Program runner.
// Takes a program object (usually an imported module),
// and some optional settings (see above) as arguments.
// Finally, an optional userData object can be passed which will be available
// as last parameter in all the module functions.
// The program object should export at least a main(), pre() or post() function.
export function run(
  program: Program,
  runSettings: Partial<Settings> = {},
  userData: object = {}
) {
  // Everything is wrapped inside a promise;
  // in case of errors in ‘program’ it will reject without reaching the bottom.
  // If the program reaches the bottom of the first frame the promise is resolved.
  return new Promise(function (resolve) {
    // Merge of user- and default settings
    const settings: Settings = {
      ...defaultSettings,
      ...runSettings,
      ...program.settings,
    };

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
    const LOCAL_STORAGE_KEY_STATE = "currentState";

    if (settings.restoreState) {
      storage.restore(LOCAL_STORAGE_KEY_STATE, state);
      state.cycle++; // Keep track of the cycle count for debugging purposes
      // The loop stores at most once per second; save the latest state on leave
      addEventListener("pagehide", () => storage.store(LOCAL_STORAGE_KEY_STATE, state));
    }
    let lastStore = -Infinity;

    // If element is not provided create a default element based
    // on the renderer settings.
    // Then choose the renderer:
    // If the parent element is a canvas the canvas renderer is selected,
    // for any other type a text node (PRE or any othe text node)
    // is expected and the text renderer is used.
    const renderer = renderers[settings.renderer] || renderers["text"]!;
    if (!settings.element) {
      settings.element = document.createElement(
        renderer.preferredElementNodeName
      );
      document.body.appendChild(settings.element);
    } else if (
      (settings.element.nodeName == "CANVAS") !=
      (renderer.preferredElementNodeName == "CANVAS")
    ) {
      console.warn(
        `The "${settings.renderer}" renderer expects a ${renderer.preferredElementNodeName} target element.`
      );
    }

    // Apply CSS settings to element
    for (const s of CSSStyles) {
      const v = settings[s];
      if (v) settings.element.style[s] = v;
    }

    // Eventqueue
    // Stores events and pops them at the end of the renderloop
    // TODO: needed?
    const eventQueue: ("pointerMove" | "pointerDown" | "pointerUp")[] = [];

    // Input pointer updated by DOM events
    const pointer: Pointer = {
      x: 0,
      y: 0,
      pressed: false,
      px: 0,
      py: 0,
      ppressed: false,
    };

    settings.element.addEventListener("pointermove", ((e: PointerEvent) => {
      const rect = settings.element?.getBoundingClientRect();
      if (!rect) return;
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      eventQueue.push("pointerMove");
    }) as EventListenerOrEventListenerObject);

    settings.element.addEventListener("pointerdown", ((e: PointerEvent) => {
      pointer.pressed = true;
      eventQueue.push("pointerDown");
    }) as EventListenerOrEventListenerObject);

    settings.element.addEventListener("pointerup", ((e: PointerEvent) => {
      pointer.pressed = false;
      eventQueue.push("pointerUp");
    }) as EventListenerOrEventListenerObject);

    const touchHandler = ((e: TouchEvent) => {
      const rect = settings.element?.getBoundingClientRect();
      if (!rect) return;
      pointer.x = e.touches[0]!.clientX - rect.left;
      pointer.y = e.touches[0]!.clientY - rect.top;
      eventQueue.push("pointerMove");
    }) as EventListenerOrEventListenerObject;

    settings.element.addEventListener("touchmove", touchHandler);
    settings.element.addEventListener("touchstart", touchHandler);
    settings.element.addEventListener("touchend", touchHandler);

    // CSS fix
    settings.element.style.fontStretch = "normal";

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
        if (--count > 0) {
          requestAnimationFrame(__run_thrice__);
        } else {
          // settings.element.style.lineHeight = Math.ceil(metrics.lineHeightf) + 'px'
          // console.log(`Using font faimily: ${ci.fontFamily} @ ${ci.fontSize}/${ci.lineHeight}`)
          // console.log(`Metrics: cellWidth: ${metrics.cellWidth}, lineHeightf: ${metrics.lineHeightf}`)
          // Finally Boot!
          boot();
        }
      })();
      // Ideal mode:
      // metrics = calcMetrics(settings.element)
      // etc.
      // requestAnimationFrame(loop)
    });

    // FPS object (keeps some state for precise FPS measure)
    const fps = new FPS();

    // What the renderers draw. main() writes it through the `out` slot,
    // frame() programs directly; pre(), post() and events see it as a buffer.
    let frame: Frame = createFrame(0, 0);
    const usesFrame = typeof program.frame == "function";

    // Metrics object, calc once (below)
    let metrics: Metrics;

    // Element size, refreshed only on resize: reading it every frame forces layout
    let rect: DOMRect;

    function boot() {
      metrics = calcMetrics(settings.element as HTMLElement);
      const el = settings.element as HTMLElement;
      rect = el.getBoundingClientRect();
      new ResizeObserver(() => (rect = el.getBoundingClientRect())).observe(el);
      const context = getContext(state, settings, metrics, fps, rect);
      // Programs get a sized frame already in boot()
      frame = createFrame((cols = context.cols), (rows = context.rows));
      if (typeof program.boot == "function") {
        program.boot(context, usesFrame ? frame : bufferOf(frame), userData);
      }
      requestAnimationFrame(loop);
    }

    // Time sample to calculate precise offset
    let timeSample = 0;
    // Previous time step to increment state.time (with state.time initial offset)
    let ptime = 0;
    const interval = 1000 / settings.fps;
    const timeOffset = state.time;

    // Used to track window resize
    let cols: number, rows: number;

    // Timestamp of the last frame that ran, for context.delta
    let lastFrameT: number | undefined;

    // Main program loop
    function loop(t: number) {
      // Timing
      const delta = t - timeSample;
      if (delta < interval) {
        // Skip the frame
        if (!settings.once) requestAnimationFrame(loop);
        return;
      }

      // Snapshot of context data
      const context = getContext(state, settings, metrics, fps, rect, lastFrameT === undefined ? 0 : t - lastFrameT);
      lastFrameT = t;

      // FPS update
      fps.update(t);

      // Timing update
      timeSample = t - (delta % interval); // adjust timeSample
      state.time = t + timeOffset; // increment time + initial offs
      state.frame++; // increment frame counter
      if (settings.restoreState && t - lastStore >= 1000) {
        storage.store(LOCAL_STORAGE_KEY_STATE, state);
        lastStore = t;
      }

      // Cursor update
      const cursor = {
        // The canvas might be slightly larger than the number
        // of cols/rows, min is required!
        x: Math.min(context.cols - 1, pointer.x / metrics.cellWidth),
        y: Math.min(context.rows - 1, pointer.y / metrics.lineHeight),
        pressed: pointer.pressed,
        p: {
          // state of previous frame
          x: pointer.px / metrics.cellWidth,
          y: pointer.py / metrics.lineHeight,
          pressed: pointer.ppressed,
        },
      };

      // Pointer: store previous state
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.ppressed = pointer.pressed;

      // 1. --------------------------------------------------------------
      // In case of resize: a fresh, empty frame
      if (cols != context.cols || rows != context.rows) {
        cols = context.cols;
        rows = context.rows;
        frame = createFrame(cols, rows);
      }

      // 2-4. ------------------------------------------------------------
      stepFrame(program, context, cursor, frame, userData);

      // 5. --------------------------------------------------------------
      renderer.render(context, frame);

      // 6. --------------------------------------------------------------
      // Queued events
      while (eventQueue.length > 0) {
        const type = eventQueue.shift();
        if (type && typeof program[type] == "function") {
          program[type](context, cursor, usesFrame ? frame : bufferOf(frame), userData);
        }
      }

      // 7. --------------------------------------------------------------
      // Loop (eventually)
      if (!settings.once) requestAnimationFrame(loop);

      // The end of the first frame is reached without errors
      // the promise can be resolved.
      resolve(context);
    }
  });
}

// -- Helpers ------------------------------------------------------------------

// One program step into `frame`: frame() programs write it directly; others
// run pre(), main() per cell and post().
export function stepFrame(program: Program, context: Context, cursor: Cursor, frame: Frame, userData: object = {}) {
  if (typeof program.frame == "function") {
    program.frame(context, cursor, frame, userData);
  } else {
    computeFrame(program, context, cursor, frame, userData);
  }
}

// The frame as a buffer of cell objects, for pre(), post(), boot() and events
// (drawInfo() and other buffer helpers work on it). One view per frame.
const views = new WeakMap<Frame, Buffer>();
export function bufferOf(frame: Frame): Buffer {
  let b = views.get(frame);
  if (!b) views.set(frame, (b = asBuffer(frame)));
  return b;
}

// Runs pre(), main() for every cell and post(), writing into `frame`.
// No DOM access: used by the render loop, the tests and the benchmark.
export function computeFrame(program: Program, context: Context, cursor: Cursor, frame: Frame, userData: object = {}) {
  const buffer = bufferOf(frame);
  frame.html.clear();

  if (typeof program.pre == "function") {
    program.pre(context, cursor, buffer, userData);
  }

  if (typeof program.main == "function") {
    const { chars, fg, bg, weight } = frame;
    const settings = context.settings;
    // Packed settings colours, for cells still at their default (0). Opaque
    // black when unset, so setting one channel never yields a transparent colour.
    const dFg = (settings.color && cssColor(settings.color)) || 0x000000ff;
    const dBg = (settings.backgroundColor && cssColor(settings.backgroundColor)) || 0x000000ff;
    const dWeight = weightCode(settings.fontWeight);
    const out = new CellOut();
    const color = out.color;
    const background = out.background;
    const coord = { x: 0, y: 0, index: 0 }; // reused for every cell

    for (let y = 0, k = 0; y < context.rows; y++) {
      for (let x = 0; x < context.cols; x++, k++) {
        coord.x = x;
        coord.y = y;
        coord.index = k;
        // Reset the slot: an empty glyph, the cell's current colours
        out.char = " ";
        out.fontWeight = undefined;
        const f0 = fg[k]!, b0 = bg[k]!;
        const fl = f0 || dFg, bl = b0 || dBg;
        color.unpack(fl);
        background.unpack(bl);
        color.dirty = background.dirty = false;

        const ret = program.main(coord, context, cursor, out, userData);
        if (ret != null) applyReturn(out, ret, frame, k);

        // Pack the slot into the frame
        const c = out.char;
        if (typeof c == "string" && c.length === 1) chars[k] = c.charCodeAt(0);
        else if (c == null) chars[k] = 32;
        else setChar(frame, k, c);
        const fp = color.pack(), bp = background.pack();
        // Untouched: keep 0 (= default) as 0.
        // shortcut: channel writes that land exactly on the default when the
        // settings colour is unset stay "default"; track channel writes if it bites.
        fg[k] = fp === fl && !color.dirty ? f0 : fp;
        bg[k] = bp === bl && !background.dirty ? b0 : bp;
        const w = out.fontWeight;
        if (w !== undefined) {
          const wc = weightCode(w);
          weight[k] = wc === dWeight ? 0 : wc;
        }
      }
    }
  }

  if (typeof program.post == "function") {
    program.post(context, cursor, buffer, userData);
  }
}

// What main() returned, applied to the slot. Returning is the short form
// (return "#"); a returned cell object is the play.core form.
function applyReturn(out: CellOut, ret: NonNullable<CellValue>, frame: Frame, k: number) {
  if (typeof ret != "object") {
    out.char = String(ret);
    return;
  }
  // A missing field keeps the cell's value; a field set to undefined resets it.
  if (ret.char != null) out.char = String(ret.char);
  else if (!("char" in ret)) out.char = getChar(frame, k);
  if (ret.color !== undefined) out.color = ret.color;
  else if ("color" in ret) out.color = 0;
  if (ret.backgroundColor !== undefined) out.background = ret.backgroundColor;
  else if ("backgroundColor" in ret) out.background = 0;
  if (ret.fontWeight !== undefined) out.fontWeight = ret.fontWeight;
  if (ret.beginHTML || ret.endHTML) frame.html.set(k, { begin: ret.beginHTML, end: ret.endHTML });
}

// Build / update the 'context' object (immutable)
// A bit of spaghetti... but the context object needs to be ready for
// the boot function and also to be updated at each frame.
function getContext(
  state: State,
  settings: Settings,
  metrics: Metrics,
  fps: FPS,
  rect: DOMRect,
  delta = 0
): Context {
  const cols = settings.cols || Math.floor(rect.width / metrics.cellWidth);
  const rows = settings.rows || Math.floor(rect.height / metrics.lineHeight);
  return Object.freeze({
    frame: state.frame,
    time: state.time,
    delta,
    cols,
    rows,
    metrics,
    width: rect.width,
    height: rect.height,
    settings,
    // Runtime & debug data
    runtime: Object.freeze({
      cycle: state.cycle,
      fps: fps.fps,
      // updatedRowNum
    }),
  }) as Context;
}

// Disables selection for an HTML element
function disableSelect(el: HTMLElement) {
  el.style.userSelect = "none";
  el.style.webkitUserSelect = "none"; // for Safari on mac and iOS
  el.style.userSelect = "none"; // for mobile FF
  el.dataset.selectionEnabled = "false";
}

// Enables selection for an HTML element
function enableSelect(el: HTMLElement) {
  el.style.userSelect = "auto";
  el.style.webkitUserSelect = "auto";
  el.style.userSelect = "auto";
  el.dataset.selectionEnabled = "true";
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
  if (!sel) throw new Error("Could not get selection");
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
  const fontFamily = style.getPropertyValue("font-family");
  const fontSize = parseFloat(style.getPropertyValue("font-size"));
  // Can’t rely on computed lineHeight since Safari 14.1
  // See:  https://bugs.webkit.org/show_bug.cgi?id=225695
  const lineHeight = parseFloat(style.getPropertyValue("line-height"));
  let cellWidth;

  // If the output element is a canvas 'measureText()' is used
  // else cellWidth is computed 'by hand' (should be the same, in any case)
  if (el.nodeName == "CANVAS") {
    // Measure on a scratch canvas: a 2d context on the output canvas would
    // lock it to 2d and make getContext("webgl2") fail.
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context");
    ctx.font = fontSize + "px " + fontFamily;
    cellWidth = ctx.measureText("".padEnd(50, "X")).width / 50;
  } else {
    const span = document.createElement("span");
    el.appendChild(span);
    span.innerHTML = "".padEnd(50, "X");
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
