import { describe, expect, it } from "vitest";

import { getGateDisplay } from "./improvement-roll-presenter";
import type { ImprovementGateSpec } from "./improvement-roll.types";

describe("getGateDisplay", () => {
  it("shows the plain threshold for a roll-over gate under 100", () => {
    expect(
      getGateDisplay({
        formula: "1d100",
        comparator: "roll-over",
        threshold: 78,
        naturalHundredAlwaysSucceeds: true,
      }),
    ).toEqual({ symbol: ">", threshold: 78 });
  });

  it("caps a roll-over threshold at 100+ to '=100' when a natural 100 can still succeed", () => {
    // A skill value of 115 minus a category modifier of -15 has already been folded into 100
    // by the time this is a threshold of exactly 100 (or, with a steeper penalty, above it) -
    // showing that raw number would look like an unbeatable target on a d100. "=" rather than
    // ">" or a bare number: a d100 can't roll above 100, so the only way to succeed is exactly
    // 100, and a bare "100" would be ambiguous with the symbol-less roll-under convention.
    expect(
      getGateDisplay({
        formula: "1d100",
        comparator: "roll-over",
        threshold: 100,
        naturalHundredAlwaysSucceeds: true,
      }),
    ).toEqual({ symbol: "=", threshold: 100 });

    expect(
      getGateDisplay({
        formula: "1d100",
        comparator: "roll-over",
        threshold: 130,
        naturalHundredAlwaysSucceeds: true,
      }),
    ).toEqual({ symbol: "=", threshold: 100 });
  });

  it("does not cap a threshold at 100+ for domains without the natural-100 exception", () => {
    const gate: ImprovementGateSpec = {
      formula: "1d100",
      comparator: "roll-over",
      threshold: 105,
      naturalHundredAlwaysSucceeds: false,
    };
    expect(getGateDisplay(gate)).toEqual({ symbol: ">", threshold: 105 });
  });

  it("shows no symbol for roll-under gates - it's the default target direction every roll card uses", () => {
    expect(getGateDisplay({ formula: "1d100", comparator: "roll-under", threshold: 45 })).toEqual({
      symbol: "",
      threshold: 45,
    });
  });
});
