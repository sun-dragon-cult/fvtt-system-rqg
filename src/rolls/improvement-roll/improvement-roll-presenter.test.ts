import { describe, expect, it } from "vitest";

import { getGateDisplay } from "./improvement-roll-presenter";
import type { ImprovementGateSpec } from "./improvement-roll.types";

describe("getGateDisplay", () => {
  // "=" rather than ">" or a bare number when a roll-over threshold reaches 100+ with the
  // natural-100 exception: a d100 can't roll above 100, so the only way to succeed is exactly
  // 100, and a bare "100" would be ambiguous with the symbol-less roll-under convention below.
  it.each`
    description                                                                    | comparator      | naturalHundredAlwaysSucceeds | threshold | expectedSymbol | expectedThreshold
    ${"roll-over: plain threshold under 100"}                                      | ${"roll-over"}  | ${true}                      | ${78}     | ${">"}         | ${78}
    ${"roll-over: plain threshold under 100 (99)"}                                 | ${"roll-over"}  | ${true}                      | ${99}     | ${">"}         | ${99}
    ${"roll-over: caps to =100 at exactly 100 with the exception flag"}            | ${"roll-over"}  | ${true}                      | ${100}    | ${"="}         | ${100}
    ${"roll-over: caps to =100 above 100 with the exception flag"}                 | ${"roll-over"}  | ${true}                      | ${130}    | ${"="}         | ${100}
    ${"roll-over: no cap at 100+ without the exception flag"}                      | ${"roll-over"}  | ${false}                     | ${105}    | ${">"}         | ${105}
    ${"roll-under: no symbol - the default target direction every roll card uses"} | ${"roll-under"} | ${false}                     | ${45}     | ${""}          | ${45}
  `(
    "$description",
    ({
      comparator,
      naturalHundredAlwaysSucceeds,
      threshold,
      expectedSymbol,
      expectedThreshold,
    }) => {
      const gate: ImprovementGateSpec = {
        formula: "1d100",
        comparator,
        threshold,
        naturalHundredAlwaysSucceeds,
      };

      expect(getGateDisplay(gate)).toEqual({
        symbol: expectedSymbol,
        threshold: expectedThreshold,
      });
    },
  );
});
