import { expect, test } from "bun:test";
import { asBuffer, colorString, createFrame, cssColor, fromBuffer, getChar, rgba, setChar } from "../src/core/frame";
import { makeRunner } from "./harness";

test("chars: code points, graphemes and empty cells round-trip", () => {
  const f = createFrame(4, 1);
  setChar(f, 0, "a");
  setChar(f, 1, "🌮"); // one code point, two UTF-16 units
  setChar(f, 2, "👩‍💻"); // several code points
  setChar(f, 3, "");
  expect([0, 1, 2, 3].map((i) => getChar(f, i))).toEqual(["a", "🌮", "👩‍💻", ""]);
  expect(f.chars[1]).toBe(0x1f32e);
  setChar(f, 0, "👩‍💻"); // interned: same index
  expect(f.chars[0]).toBe(f.chars[2]!);
});

test("colours pack and print back", () => {
  expect(rgba(255, 0, 128)).toBe(0xff0080ff);
  expect(cssColor("#ff0080")).toBe(0xff0080ff);
  expect(cssColor("rgb(255, 0, 128)")).toBe(0xff0080ff);
  expect(cssColor("rgba(255,0,128,0.5)")).toBe(rgba(255, 0, 128, 128));
  expect(colorString(0xff0080ff)).toBe("rgb(255,0,128)");
});

test("fromBuffer stores settings defaults as 0", () => {
  const f = createFrame(3, 1);
  const settings = { color: "#000000", backgroundColor: "#ffffff", fontWeight: "400" };
  fromBuffer(
    [
      { char: "a", color: "#000000", backgroundColor: "#ffffff", fontWeight: "400" },
      { char: "b", color: "#ff0000", backgroundColor: "#00ff00", fontWeight: "bold" },
      { char: "c", beginHTML: "<a>", endHTML: "</a>" },
    ],
    f,
    settings as any
  );
  expect([...f.fg]).toEqual([0, 0xff0000ff, 0]);
  expect([...f.bg]).toEqual([0, 0x00ff00ff, 0]);
  expect([...f.weight]).toEqual([0, 7, 0]);
  expect(f.html.get(2)).toEqual({ begin: "<a>", end: "</a>" });
});

test("asBuffer reads and writes cells as objects", () => {
  const f = createFrame(2, 1);
  const b = asBuffer(f);
  b[1] = { char: "x", color: "#ff0000", fontWeight: "700" };
  expect(b.length).toBe(2);
  expect(b[1]).toEqual({ char: "x", color: "rgb(255,0,0)", fontWeight: "700" });
  expect(getChar(f, 1)).toBe("x");
});

test("README frame() example runs", () => {
  const step = makeRunner(
    {
      frame(_context: any, _cursor: any, out: any) {
        const red = cssColor("#ff0000");
        for (let k = 0; k < out.cols * out.rows; k++) {
          out.chars[k] = 0x23;
          out.fg[k] = red;
          out.bg[k] = rgba(0, 0, k % 256, 255);
        }
        setChar(out, 0, "👩‍💻");
      },
    } as any,
    3,
    2
  );
  const f = step();
  expect([0, 1, 5].map((i) => getChar(f, i))).toEqual(["👩‍💻", "#", "#"]);
  expect(f.bg[5]).toBe(rgba(0, 0, 5));
});
