// Shader sources are separate files, imported as text:
//   import src from "./grid.frag" with { type: "text" };
declare module "*.vert" {
  const source: string;
  export default source;
}
declare module "*.frag" {
  const source: string;
  export default source;
}
