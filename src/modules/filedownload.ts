/**
@module   filedownload
@desc     Exports a file via Blob
@category internal

Downloads a Blob as file and this “hack”:
creates an anchor with a “download” attribute
and then emits a click event.
See: https://github.com/tomast1337/FileSaver.ts
*/

type FileExt = "js" | "txt" | "png" | "jpg";

const mimeTypes: Record<FileExt, string> = {
  js: "text/javascript",
  txt: "text/plain",
  png: "image/png",
  jpg: "text/jpeg",
};

// For text elements
export function saveSourceAsFile(src: string, filename: string) {
  const ext = getFileExt(filename);
  const type = mimeTypes[ext];
  const blob = type ? new Blob([src], { type }) : new Blob([src]);
  saveBlobAsFile(blob, filename);
}

// Gets extension of a filename
function getFileExt(filename: string): FileExt {
  const ext = filename.split(".").pop() || "";
  const exts = ["js", "txt", "png", "jpg"];
  if (exts.includes(ext)) {
    return ext as FileExt;
  }
  return "txt";
}

// For canvas elements
export function saveBlobAsFile(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.download = filename;
  a.rel = "noopener";
  a.href = URL.createObjectURL(blob);

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 10000);
  setTimeout(() => {
    click(a);
  }, 0);
}

function click(node: HTMLAnchorElement) {
  try {
    node.dispatchEvent(new MouseEvent("click"));
  } catch (err) {
    var e: MouseEvent = document.createEvent("MouseEvents");
    // @ts-ignore
    e.initMouseEvent("click");
    node.dispatchEvent(e);
  }
}
