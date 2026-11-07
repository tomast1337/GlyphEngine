// Pins current engine output. Refactors must keep these snapshots unchanged;
// update them (bun test --update-snapshots) only for an intended output change.
import { expect, test } from "bun:test";
import { makeRunner } from "./harness";
import { getChar } from "../src/core/frame";
import * as plasma from "../src/programs/demos/plasma";
import * as donut from "../src/programs/demos/donut";

const programs = { plasma, donut };

for (const [name, program] of Object.entries(programs)) {
  test(`${name}: output after 5 frames`, () => {
    const step = makeRunner(program, 40, 20);
    for (let i = 0; i < 4; i++) step();
    const frame = step();
    // Chars as readable rows; styles as one hash to keep the snapshot small.
    const rows = Array.from({ length: 20 }, (_, y) => Array.from({ length: 40 }, (_, x) => getChar(frame, y * 40 + x)).join(""));
    const styles = Bun.hash(new Uint8Array([...new Uint8Array(frame.fg.buffer), ...new Uint8Array(frame.bg.buffer), ...frame.weight])).toString(16);
    expect({ rows, styles }).toMatchSnapshot();
  });
}
