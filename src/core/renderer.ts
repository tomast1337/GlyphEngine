import type { Context } from "../program";
import type { Frame } from "./frame";
import type { GpuStep } from "./webgpurenderer";

export type RenderModes = string;

export type Render = {
  preferredElementNodeName: RenderModes;
  // gpu: a WGSL program the renderer runs itself (WebGPU only)
  render: (context: Context, frame: Frame, gpu?: GpuStep) => void;
};
