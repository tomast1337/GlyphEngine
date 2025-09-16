import type { Context, Buffer } from "../modules/types";

export type RenderModes = string;

export type Render = {
  preferredElementNodeName: RenderModes;
  render: (context: Context, buffer: Buffer) => void;
};
