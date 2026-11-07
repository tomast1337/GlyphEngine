import type { Context } from "../program";
import type { Frame } from "./frame";

export type RenderModes = string;

export type Render = {
  preferredElementNodeName: RenderModes;
  render: (context: Context, frame: Frame) => void;
};
