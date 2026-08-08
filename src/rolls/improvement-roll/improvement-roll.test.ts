import { beforeEach, describe, expect, it } from "vitest";

import type { ImprovementRequest } from "./improvement-roll.types";

/** Queued outcomes the fake Roll hands out, in the order the resolver constructs rolls. */
type QueuedRoll = { total: number };

const rolled: string[] = [];
let queue: QueuedRoll[] = [];

class FakeRoll {
  formula: string;
  total: number | undefined;

  constructor(formula: string) {
    this.formula = formula;
    rolled.push(formula);
  }

  async evaluate(): Promise<this> {
    this.total = queue.shift()?.total;
    return this;
  }
}

(globalThis as any).foundry.dice.Roll = FakeRoll;

// Imported after the Roll stub is in place - `import Roll = foundry.dice.Roll` captures the
// binding at module evaluation time.
const { resolveImprovement } = await import("./improvement-roll");

function buildRequest(overrides: Partial<ImprovementRequest> = {}): ImprovementRequest {
  return {
    domain: "ability",
    source: "experience",
    name: "Dodge",
    typeLocName: "Skill",
    actorName: "Vasana",
    currentValue: 65,
    valueSuffix: "%",
    gate: {
      formula: "1d100",
      comparator: "roll-over",
      threshold: 65,
    },
    gain: { kind: "random", formula: "1d6" },
    gateBreakdownChips: [],
    speaker: {} as ChatMessage.SpeakerData,
    ...overrides,
  };
}

describe("resolveImprovement", () => {
  beforeEach(() => {
    rolled.length = 0;
    queue = [];
  });

  it("rolls the gain and reports the new value when the gate succeeds", async () => {
    queue = [{ total: 88 }, { total: 4 }];

    const { result } = await resolveImprovement(buildRequest());

    expect(rolled).toEqual(["1d100", "1d6"]);
    expect(result.succeeded).toBe(true);
    expect(result.gateTotal).toBe(88);
    expect(result.gain).toBe(4);
    expect(result.previousValue).toBe(65);
    expect(result.newValue).toBe(69);
  });

  it("skips the gain roll entirely when the gate fails", async () => {
    queue = [{ total: 30 }];

    const { result, gainRoll } = await resolveImprovement(buildRequest());

    expect(rolled).toEqual(["1d100"]);
    expect(gainRoll).toBeUndefined();
    expect(result.succeeded).toBe(false);
    expect(result.gain).toBe(0);
    expect(result.newValue).toBe(65);
  });

  it("gains without rolling a gate when the source has none", async () => {
    queue = [{ total: 2 }];

    const { result, gateRoll } = await resolveImprovement(
      buildRequest({
        source: "training",
        gate: undefined,
        gain: { kind: "random", formula: "1d6-1" },
      }),
    );

    expect(rolled).toEqual(["1d6-1"]);
    expect(gateRoll).toBeUndefined();
    expect(result.succeeded).toBe(true);
    expect(result.gateTotal).toBeUndefined();
    expect(result.gain).toBe(2);
    expect(result.newValue).toBe(67);
  });

  function buildCharacteristicRequest() {
    return buildRequest({
      domain: "characteristic",
      valueSuffix: "",
      currentValue: 13,
      gate: { formula: "1d100", comparator: "roll-under", threshold: 45 },
      gain: { kind: "random", formula: "1d3-1" },
    });
  }

  it("applies the roll-under comparator for characteristics: gains at/under the threshold", async () => {
    queue = [{ total: 44 }, { total: 1 }];

    const { result } = await resolveImprovement(buildCharacteristicRequest());

    expect(result).toMatchObject({ succeeded: true, gain: 1, newValue: 14 });
  });

  it("applies the roll-under comparator for characteristics: fails above the threshold", async () => {
    queue = [{ total: 46 }];

    const { result } = await resolveImprovement(buildCharacteristicRequest());

    expect(result).toMatchObject({ succeeded: false, gain: 0, newValue: 13 });
  });

  it("gains on a 100 that a negative category modifier pushed the threshold above", async () => {
    queue = [{ total: 100 }, { total: 6 }];

    const { result } = await resolveImprovement(
      buildRequest({
        gate: {
          formula: "1d100",
          comparator: "roll-over",
          threshold: 105,
          naturalHundredAlwaysSucceeds: true,
        },
      }),
    );

    expect(result.succeeded).toBe(true);
    expect(result.gain).toBe(6);
  });

  it("treats a gain roll that totals zero as no gain", async () => {
    queue = [{ total: 88 }, { total: 0 }];

    const { result } = await resolveImprovement(buildRequest());

    expect(result.succeeded).toBe(true);
    expect(result.gain).toBe(0);
    expect(result.newValue).toBe(65);
  });

  it("clamps the gain so it never pushes currentValue past maxValue (e.g. a Rune's 100% cap)", async () => {
    queue = [{ total: 88 }, { total: 5 }];

    const { result } = await resolveImprovement(buildRequest({ currentValue: 98, maxValue: 100 }));

    expect(result.gain).toBe(2);
    expect(result.newValue).toBe(100);
  });

  it("leaves the gain untouched when it already fits under maxValue", async () => {
    queue = [{ total: 88 }, { total: 1 }];

    const { result } = await resolveImprovement(buildRequest({ currentValue: 98, maxValue: 100 }));

    expect(result.gain).toBe(1);
    expect(result.newValue).toBe(99);
  });
});
