import { expect, test } from "bun:test";
import { makeRunner } from "./harness";
import { getChar } from "../src/core/frame";

test("main() writes stay per cell after post() put one object in several cells", () => {
  let first = true;
  const step = makeRunner(
    {
      main: (coord) => "ab"[coord.index],
      post: (_ctx, _cur, buffer) => {
        // Like setRect: the same object in two cells, on the first frame only.
        if (first) buffer[0] = buffer[1] = { char: "#" };
        first = false;
      },
    },
    2,
    1
  );
  step();
  const frame = step();
  expect([getChar(frame, 0), getChar(frame, 1)]).toEqual(["a", "b"]);
});

test("main() writes the out slot: glyphs, CSS / channel colours, clamping, defaults", () => {
  const step = makeRunner(
    {
      settings: { color: "#000000" },
      main(coord, _ctx, _cur, out) {
        if (coord.index === 0) {
          out.char = "👩‍💻";
          out.color = "#ff0000";
          out.background.r = 300; // clamped to 255
          out.background.g = -5; // clamped to 0
          out.background.b = 127.9; // truncated
        } else if (coord.index === 1) {
          out.color = "#000000"; // equal to the default but assigned: kept
          out.fontWeight = "bold";
        } else if (coord.index === 2) {
          return { char: "x", backgroundColor: "#00ff00" };
        }
        // index 3: untouched, a space with default colours
      },
    },
    4,
    1
  );
  const f = step();
  expect([0, 1, 2, 3].map((i) => getChar(f, i))).toEqual(["👩‍💻", " ", "x", " "]);
  expect([...f.fg]).toEqual([0xff0000ff, 0x000000ff, 0, 0]);
  expect([...f.bg]).toEqual([0xff007fff, 0, 0x00ff00ff, 0]);
  expect([...f.weight]).toEqual([0, 7, 0, 0]);
});
