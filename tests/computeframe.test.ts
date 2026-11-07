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
