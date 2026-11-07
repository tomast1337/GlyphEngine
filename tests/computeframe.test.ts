import { expect, test } from "bun:test";
import { makeRunner } from "./harness";

test("main() writes stay per cell after post() put one object in several cells", () => {
  let first = true;
  const step = makeRunner(
    {
      main: (coord: any) => "ab"[coord.index],
      post: (_ctx: any, _cur: any, buffer: any[]) => {
        // Like setRect: the same object in two cells, on the first frame only.
        if (first) buffer[0] = buffer[1] = { char: "#" };
        first = false;
      },
    } as any,
    2,
    1
  );
  step();
  expect(step().map((c) => c.char)).toEqual(["a", "b"]);
});
