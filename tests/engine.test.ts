// Pins current engine output. Refactors must keep these snapshots unchanged;
// update them (bun test --update-snapshots) only for an intended output change.
import { expect, test } from "bun:test";
import { makeRunner } from "./harness";
import * as plasma from "../src/programs/demos/plasma";
import * as donut from "../src/programs/demos/donut";

const programs = { plasma, donut };

for (const [name, program] of Object.entries(programs)) {
  test(`${name}: output after 5 frames`, () => {
    const step = makeRunner(program as any, 40, 20);
    for (let i = 0; i < 4; i++) step();
    const buffer = step();
    expect(buffer.map(({ char, color, backgroundColor, fontWeight }) => ({ char, color, backgroundColor, fontWeight }))).toMatchSnapshot();
  });
}
