import type { Context, Frame } from '@glyph-engine/core';

import type { GpuStep } from './webgpurenderer';

export type RenderModes = string;

export type Render = {
    preferredElementNodeName: RenderModes;
    // gpu: a WGSL program the renderer runs itself (WebGPU only)
    render: (context: Context, frame: Frame, gpu?: GpuStep) => void;
};
