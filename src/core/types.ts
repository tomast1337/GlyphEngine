import { Context, Buffer } from "../modules/types";

export type Render = {
  preferredElementNodeName: "PRE" | "CANVAS" | "DIV";
  render: (context: Context, buffer: Buffer) => void;
};
