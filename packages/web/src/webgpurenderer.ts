/// <reference types="@webgpu/types" />
/**
@module   webgpurenderer
@desc     renders to canvas with WebGPU; runs WGSL programs on the GPU
@category renderer
*/

import type { Context, Cursor } from '@glyph-engine/core';
import { cssColor, type Frame } from '@glyph-engine/core';

import { fitCanvas } from './canvassize';
import { FLAG_COLOR_GLYPH, GlyphAtlas } from './glyphatlas';
import type { Render } from './renderer';
import gridSource from './shaders/grid.wgsl' with { type: 'text' };
import programSource from './shaders/program.wgsl' with { type: 'text' };
import webglRenderer from './webglrenderer';

// A program whose main() is WGSL (program.wgsl), run by this renderer.
export type GpuStep = { wgsl: string; glyphs: string; cursor: Cursor };

export default {
    preferredElementNodeName: 'CANVAS',
    render,
} as Render;

const FLAG_OVERLAY = 2; // keep in sync with grid.wgsl

// One device for the page; null when WebGPU is unavailable (or was lost).
let device: GPUDevice | null | undefined;

// Asks for the device once; true when WebGPU works. run() awaits it before the
// first frame. (Returns no GPU types: they would leak into the published .d.ts.)
export async function initWebGPU(): Promise<boolean> {
    if (device !== undefined) return !!device;
    try {
        const adapter = await navigator.gpu?.requestAdapter();
        device = adapter ? await adapter.requestDevice() : null;
    } catch {
        device = null;
    }
    // shortcut: a lost device falls back to WebGL2 for good instead of re-creating it.
    device?.lost.then(() => (device = null));
    return !!device;
}

// -- WGSL programs -------------------------------------------------------------

type Compiled = {
    pipeline: GPUComputePipeline;
    layout: GPUBindGroupLayout;
    glyphs: number[];
};
const compiled = new Map<string, Compiled>(); // by wgsl + glyphs

// Lines before the program in the compiled code: the GLYPHS line plus the prelude.
const PRELUDE_LINES = programSource.slice(0, programSource.indexOf('// PROGRAM')).split('\n').length;

// Compiles a program's WGSL once; throws the shader errors with the line numbers
// of the program's own source.
export async function compileGpuProgram(wgsl: string, glyphs: string) {
    const dev = device;
    if (!dev) throw new Error('WebGPU is not available');
    const id = glyphs + '\0' + wgsl;
    if (compiled.has(id)) return;
    const points = [...glyphs].map((c) => c.codePointAt(0)!);
    if (points.length === 0) points.push(32);
    const code = `const GLYPHS: u32 = ${points.length}u;\n` + programSource.replace('// PROGRAM', wgsl);
    const module = dev.createShaderModule({ code });
    const errors = (await module.getCompilationInfo()).messages.filter((m) => m.type === 'error');
    if (errors.length) {
        const lines = errors.map((m) => {
            const line = m.lineNum - PRELUDE_LINES;
            return (line > 0 ? `line ${line}:${m.linePos}: ` : '') + m.message;
        });
        throw new Error('WGSL error in the program:\n' + lines.join('\n'));
    }
    const entry = (type: GPUBufferBindingType): GPUBindGroupLayoutEntry => ({
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type },
    });
    const layout = dev.createBindGroupLayout({
        entries: [
            { ...entry('uniform'), binding: 0 },
            { ...entry('read-only-storage'), binding: 1 },
            { ...entry('read-only-storage'), binding: 2 },
            { ...entry('storage'), binding: 3 },
        ],
    });
    const pipeline = await dev.createComputePipelineAsync({
        layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
        compute: { module, entryPoint: 'ge_main' },
    });
    compiled.set(id, { pipeline, layout, glyphs: points });
}

// -- Per canvas state ------------------------------------------------------------

type GPUState = ReturnType<typeof createState>;
const states = new WeakMap<HTMLCanvasElement, GPUState>();

function render(context: Context, frame: Frame, gpu?: GpuStep) {
    const dev = device;
    const canvas = context.settings.element as HTMLCanvasElement;
    let s = states.get(canvas);
    // shortcut: after a device loss a canvas that had a WebGPU context can't get
    // another kind; it stops updating. Reload the page to recover.
    if (!dev && s) return;
    // Without WebGPU (or with centered text, which needs per-glyph measuring) the
    // WebGL2 renderer draws; it falls back to Canvas2D in turn.
    if (!dev || context.settings.textAlign == 'center') return webglRenderer.render(context, frame);
    if (!s || s.device !== dev) states.set(canvas, (s = createState(dev, canvas)));
    draw(s, context, frame, gpu);
}

function createState(dev: GPUDevice, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('webgpu')!;
    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device: dev, format, alphaMode: 'opaque' });
    const module = dev.createShaderModule({ code: gridSource });
    const layout = dev.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: { type: 'uniform' },
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: { type: 'read-only-storage' },
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: { type: 'read-only-storage' },
            },
            {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: 'float' },
            },
        ],
    });
    const pipeline = dev.createRenderPipeline({
        layout: dev.createPipelineLayout({ bindGroupLayouts: [layout] }),
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    });
    const size = Math.min(2048, dev.limits.maxTextureDimension2D);
    const s = {
        device: dev,
        ctx,
        pipeline,
        layout,
        drawUniforms: dev.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }),
        drawData: new ArrayBuffer(64),
        atlasTexture: createAtlasTexture(dev, size),
        atlas: null as unknown as GlyphAtlas,
        cols: 0,
        rows: 0,
        cells: null as unknown as GPUBuffer, // what the frame or the compute pass fills
        overlay: null as unknown as GPUBuffer, // what pre()/post() drew over a GPU program
        cellData: new Uint32Array(0),
        overlayData: new Uint32Array(0),
        overlayEmpty: false, // the overlay buffer holds only zeros
        bindGroup: null as GPUBindGroup | null,
        // WGSL program state: inputs per program, the bind group per grid size
        engineUniforms: dev.createBuffer({
            size: 80,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        }),
        engineData: new ArrayBuffer(80),
        program: null as null | {
            id: string;
            glyphBuffer: GPUBuffer;
            slotBuffer: GPUBuffer;
            generation: number;
            bindGroup: GPUBindGroup | null;
        },
    };
    s.atlas = new GlyphAtlas(size, (x, y, glyph) => {
        dev.queue.copyExternalImageToTexture({ source: glyph }, { texture: s.atlasTexture, origin: { x, y }, premultipliedAlpha: true }, [glyph.width, glyph.height]);
    });
    return s;
}

function createAtlasTexture(dev: GPUDevice, size: number) {
    return dev.createTexture({
        size: [size, size],
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
}

function draw(s: GPUState, context: Context, frame: Frame, gpu?: GpuStep) {
    const dev = s.device;
    const canvas = context.settings.element as HTMLCanvasElement;
    const settings = context.settings;
    const m = context.metrics;
    const scale = devicePixelRatio;
    fitCanvas(canvas, context, scale);

    const cols = context.cols;
    const rows = context.rows;
    const cw = m.cellWidth;
    const ch = Math.round(m.lineHeight);
    const fontSize = m.fontSize * scale;
    // Slots are two cells wide so wide glyphs (emoji, CJK) can overflow into the next cell.
    if (s.atlas.ensure(2 * Math.ceil(cw * scale), Math.ceil(ch * scale), fontSize + 'px ' + m.fontFamily)) {
        s.atlasTexture.destroy();
        s.atlasTexture = createAtlasTexture(dev, s.atlas.size);
        s.bindGroup = null;
    }
    ensureCells(s, cols, rows);

    // Same defaults as the canvas renderer
    const bg = cssColor(settings.backgroundColor || 'white');
    const fg = cssColor(settings.color || 'black');
    const fontWeight = String(settings.fontWeight || '400');

    const encoder = dev.createCommandEncoder();
    if (gpu) {
        // The program runs on the GPU; the frame holds only what pre()/post() drew
        // (chars 0 elsewhere), drawn on top.
        const data = s.overlayData;
        let any = false;
        for (let k = 0, n = cols * rows; k < n; k++) {
            const o = k * 4;
            if (frame.chars[k] === 0) {
                data[o] = data[o + 1] = data[o + 2] = data[o + 3] = 0;
                continue;
            }
            any = true;
            const slot = s.atlas.cellSlot(frame, k, fontWeight, fontSize, m.fontFamily);
            data[o] = slot;
            data[o + 1] = frame.fg[k] || fg;
            data[o + 2] = frame.bg[k] || bg;
            data[o + 3] = FLAG_OVERLAY | (s.atlas.colored[slot] ? FLAG_COLOR_GLYPH : 0);
        }
        if (any || !s.overlayEmpty) dev.queue.writeBuffer(s.overlay, 0, data);
        s.overlayEmpty = !any;
        runProgram(s, encoder, context, gpu, fg, bg, fontWeight, fontSize, m.fontFamily);
    } else {
        s.atlas.writeCells(s.cellData, frame, fg, bg, fontWeight, fontSize, m.fontFamily);
        dev.queue.writeBuffer(s.cells, 0, s.cellData);
    }

    // Grid origin, as the canvas renderer computes it (CSS px, rounded)
    let ox = 0;
    let oy = 0;
    if (settings.canvasOffset) {
        const offs = settings.canvasOffset;
        ox = Math.round(offs.x == 'auto' ? (canvas.width / scale - cols * cw) / 2 : offs.x);
        oy = Math.round(offs.y == 'auto' ? (canvas.height / scale - rows * ch) / 2 : offs.y);
    }
    const f = new Float32Array(s.drawData);
    const u = new Uint32Array(s.drawData);
    f.set([cw * scale, ch * scale, ox * scale, oy * scale], 0);
    u.set([cols, rows, s.atlas.slotW, s.atlas.slotH], 4);
    f.set([(bg >>> 24) / 255, ((bg >>> 16) & 255) / 255, ((bg >>> 8) & 255) / 255, 1], 8);
    u.set([s.atlas.perRow, bg, gpu ? 1 : 0], 12);
    dev.queue.writeBuffer(s.drawUniforms, 0, s.drawData);

    s.bindGroup ??= dev.createBindGroup({
        layout: s.layout,
        entries: [
            { binding: 0, resource: { buffer: s.drawUniforms } },
            { binding: 1, resource: { buffer: s.cells } },
            { binding: 2, resource: { buffer: s.overlay } },
            { binding: 3, resource: s.atlasTexture.createView() },
        ],
    });
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: s.ctx.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: [0, 0, 0, 1],
            },
        ],
    });
    pass.setPipeline(s.pipeline);
    pass.setBindGroup(0, s.bindGroup);
    pass.draw(3);
    pass.end();
    dev.queue.submit([encoder.finish()]);
}

// Dispatches the program's compute pass, which fills `cells`.
function runProgram(s: GPUState, encoder: GPUCommandEncoder, context: Context, gpu: GpuStep, fg: number, bg: number, fontWeight: string, fontSize: number, family: string) {
    const dev = s.device;
    const id = gpu.glyphs + '\0' + gpu.wgsl;
    const c = compiled.get(id);
    if (!c) throw new Error('WGSL program not compiled: run() compiles it before the first frame');

    let p = s.program;
    if (!p || p.id !== id) {
        p?.glyphBuffer.destroy();
        p?.slotBuffer.destroy();
        const glyphBuffer = dev.createBuffer({
            size: c.glyphs.length * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        dev.queue.writeBuffer(glyphBuffer, 0, new Uint32Array(c.glyphs));
        const slotBuffer = dev.createBuffer({
            size: 0x10000 * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        s.program = p = {
            id,
            glyphBuffer,
            slotBuffer,
            generation: -1,
            bindGroup: null,
        };
    }

    // Code point -> atlas slot for the program's glyphs; again whenever the atlas forgot its slots.
    // shortcut: glyphs outside the BMP and font weights other than the default draw nothing.
    if (p.generation !== s.atlas.generation) {
        const slots = new Uint32Array(0x10000);
        for (const cp of c.glyphs) {
            if (cp >= 0x10000 || cp === 32) continue;
            const slot = s.atlas.slot(0, cp, String.fromCodePoint(cp), fontWeight, fontSize, family);
            slots[cp] = slot | ((s.atlas.colored[slot] ? FLAG_COLOR_GLYPH : 0) << 16);
        }
        dev.queue.writeBuffer(p.slotBuffer, 0, slots);
        p.generation = s.atlas.generation;
    }

    const f = new Float32Array(s.engineData);
    const u = new Uint32Array(s.engineData);
    f[0] = context.time;
    f[1] = context.delta;
    u[2] = context.frame;
    u[3] = context.cols;
    u[4] = context.rows;
    f[5] = context.metrics.aspect;
    f[6] = gpu.cursor.x;
    f[7] = gpu.cursor.y;
    u[8] = gpu.cursor.pressed ? 1 : 0;
    f.set(unpack(fg), 12);
    f.set(unpack(bg), 16);
    dev.queue.writeBuffer(s.engineUniforms, 0, s.engineData);

    p.bindGroup ??= dev.createBindGroup({
        layout: c.layout,
        entries: [
            { binding: 0, resource: { buffer: s.engineUniforms } },
            { binding: 1, resource: { buffer: p.glyphBuffer } },
            { binding: 2, resource: { buffer: p.slotBuffer } },
            { binding: 3, resource: { buffer: s.cells } },
        ],
    });
    const pass = encoder.beginComputePass();
    pass.setPipeline(c.pipeline);
    pass.setBindGroup(0, p.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(context.cols / 8), Math.ceil(context.rows / 8));
    pass.end();
}

const unpack = (c: number) => [c >>> 24, (c >>> 16) & 255, (c >>> 8) & 255, c & 255].map((v) => v / 255);

// (Re)allocates the cell buffers when the grid size changes.
function ensureCells(s: GPUState, cols: number, rows: number) {
    if (s.cols === cols && s.rows === rows) return;
    s.cols = cols;
    s.rows = rows;
    const size = Math.max(16, cols * rows * 16);
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    s.cells?.destroy();
    s.overlay?.destroy();
    s.cells = s.device.createBuffer({ size, usage });
    s.overlay = s.device.createBuffer({ size, usage });
    s.cellData = new Uint32Array(cols * rows * 4);
    s.overlayData = new Uint32Array(cols * rows * 4);
    s.overlayEmpty = true; // new buffers start zeroed
    s.bindGroup = null;
    if (s.program) s.program.bindGroup = null;
}
