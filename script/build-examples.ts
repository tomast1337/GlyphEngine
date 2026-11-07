// Builds the playground into ./out:
//   index.html         single page: output, editable source, example list
//   glyph-engine.js    the engine bundle (programs import "glyph-engine")
//   programs/**.js     each example with types stripped, comments kept
//   examples.json      list for the sidebar
// Usage: bun run build:examples [--watch]   (--watch also serves on $PORT, default 3000)
import * as fs from "fs";
import ts from "typescript";

const outDir = "./out";

const meta = (src: string, tag: string) =>
  src.match(new RegExp(`@${tag}\\s+(.*)`))?.[1]?.trim() ?? null;

// tsc drops blank lines, so mark them before and restore after.
function stripTypes(src: string) {
  const marked = src.replace(/^[ \t]*$/gm, "//__blank__");
  const js = ts.transpileModule(marked, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
  }).outputText;
  // The header comment sits on the `import type` line, which tsc removes with it.
  const header = src.match(/^\/\*[\s\S]*?\*\/\n+/)?.[0] ?? "";
  return (header + js.replace(/^[ \t]*\/\/__blank__$/gm, "").replace(header, "")).replace(/\n{3,}/g, "\n\n");
}

async function build() {
  fs.rmSync(outDir, { recursive: true, force: true });

  const engine = await Bun.build({ entrypoints: ["./src/index.ts"], outdir: outDir, naming: "glyph-engine.js", target: "browser" });
  if (!engine.success) throw new AggregateError(engine.logs, "engine build failed");

  const paths = [...new Bun.Glob("src/programs/**/*.ts").scanSync(".")].sort();
  const examples = [];
  for (const path of paths) {
    const src = await Bun.file(path).text();
    const file = path.replace("src/programs/", "").replace(/\.ts$/, ".js");
    await Bun.write(`${outDir}/programs/${file}`, stripTypes(src));
    examples.push({ file, group: file.split("/")[0], title: meta(src, "title") ?? file, author: meta(src, "author") });
  }
  await Bun.write(`${outDir}/examples.json`, JSON.stringify(examples));
  fs.copyFileSync("./script/playground.html", `${outDir}/index.html`);
  console.log(`Built playground with ${examples.length} examples`);
}

await build();

if (process.argv.includes("--watch")) {
  let timer: Timer | undefined;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error("Rebuild failed:", e)), 100);
  };
  fs.watch("./src", { recursive: true }, rebuild);
  fs.watch("./script/playground.html", rebuild);

  const server = Bun.serve({
    port: Number(process.env.PORT) || 3000,
    async fetch(req) {
      const path = new URL(req.url).pathname;
      const file = Bun.file(outDir + (path.endsWith("/") ? path + "index.html" : path));
      return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
    },
  });
  console.log(`Watching ./src, serving http://localhost:${server.port}/`);
}
