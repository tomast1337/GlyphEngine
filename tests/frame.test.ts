import { expect, test } from "bun:test";
import { asBuffer, colorString, createFrame, cssColor, getChar, rgba, setChar } from "../src/core/frame";

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

test("asBuffer reads and writes cells as objects", () => {
  const f = createFrame(2, 1);
  const b = asBuffer(f);
  b[1] = { char: "x", color: "#ff0000", fontWeight: "700" };
  expect(b.length).toBe(2);
  expect(b[1]).toEqual({ char: "x", color: "rgb(255,0,0)", fontWeight: "700" });
  expect(getChar(f, 1)).toBe("x");
});
