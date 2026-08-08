import { describe, expect, it } from "vitest";

import { evaluateImprovementGate } from "./evaluate-improvement-gate";
import type { ImprovementGateSpec } from "./improvement-roll.types";

describe("evaluateImprovementGate", () => {
  it.each`
    description                                                            | comparator      | naturalHundredAlwaysSucceeds | threshold | rollTotal    | expected
    ${"roll-over: gains when the roll beats the threshold"}                | ${"roll-over"}  | ${true}                      | ${65}     | ${66}        | ${true}
    ${"roll-over: fails when the roll equals the threshold"}               | ${"roll-over"}  | ${true}                      | ${65}     | ${65}        | ${false}
    ${"roll-over: fails when the roll is below the threshold"}             | ${"roll-over"}  | ${true}                      | ${65}     | ${12}        | ${false}
    ${"roll-over: a 100 succeeds even past a threshold pushed above 100"}  | ${"roll-over"}  | ${true}                      | ${120}    | ${100}       | ${true}
    ${"roll-over: a 100 does not auto-succeed without the exception flag"} | ${"roll-over"}  | ${false}                     | ${105}    | ${100}       | ${false}
    ${"roll-under: gains when the roll is below the threshold"}            | ${"roll-under"} | ${false}                     | ${45}     | ${12}        | ${true}
    ${"roll-under: gains when the roll equals the threshold"}              | ${"roll-under"} | ${false}                     | ${45}     | ${45}        | ${true}
    ${"roll-under: fails when the roll is above the threshold"}            | ${"roll-under"} | ${false}                     | ${45}     | ${46}        | ${false}
    ${"roll-under: a 100 is never a special case, even with the flag set"} | ${"roll-under"} | ${true}                      | ${45}     | ${100}       | ${false}
    ${"fails when the roll-over gate produced no total"}                   | ${"roll-over"}  | ${true}                      | ${65}     | ${undefined} | ${false}
    ${"fails when the roll-under gate produced no total"}                  | ${"roll-under"} | ${false}                     | ${45}     | ${undefined} | ${false}
  `(
    "$description",
    ({ comparator, naturalHundredAlwaysSucceeds, threshold, rollTotal, expected }) => {
      const gate: ImprovementGateSpec = {
        formula: "1d100",
        comparator,
        threshold,
        naturalHundredAlwaysSucceeds,
      };

      expect(evaluateImprovementGate(gate, rollTotal)).toBe(expected);
    },
  );
});
