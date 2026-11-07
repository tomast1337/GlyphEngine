import type { Context } from "../modules/types";
import type { Frame } from "./frame";

export type RenderModes = string;

export type Render = {
  preferredElementNodeName: RenderModes;
  render: (context: Context, frame: Frame) => void;
};
