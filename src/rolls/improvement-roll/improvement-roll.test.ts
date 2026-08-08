import { beforeEach, describe, expect, it } from "vitest";

import type { ImprovementRequest } from "./improvement-roll.types";

/** Queued outcomes the fake Roll hands out, in the order the resolver constructs rolls. */
type QueuedRoll = { total: number; natural?: number };

const rolled: string[] = [];
let queue: QueuedRoll[] = [];

class FakeRoll {
  formula: string;
  total: number | undefined;
  dice: { total: number }[] = [];

  constructor(formula: string) {
    this.formula = formula;
    rolled.push(formula);
  }

  async evaluate(): Promise<this> {
    const next = queue.shift();
    this.total = next?.total;
    this.dice = next?.natural == null ? [] : [{ total: next.natural }];
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

  it("applies the roll-under comparator for characteristics", async () => {
    const characteristicRequest = buildRequest({
      domain: "characteristic",
      valueSuffix: "",
      currentValue: 13,
      gate: { formula: "1d100", comparator: "roll-under", threshold: 45 },
      gain: { kind: "random", formula: "1d3-1" },
    });

    queue = [{ total: 44 }, { total: 1 }];
    expect((await resolveImprovement(characteristicRequest)).result).toMatchObject({
      succeeded: true,
      gain: 1,
      newValue: 14,
    });

    queue = [{ total: 46 }];
    expect((await resolveImprovement(characteristicRequest)).result).toMatchObject({
      succeeded: false,
      gain: 0,
      newValue: 13,
    });
  });

  it("gains on a natural 100 that a negative category modifier pushed the threshold above", async () => {
    queue = [{ total: 100, natural: 100 }, { total: 6 }];

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
    expect(result.gateNaturalTotal).toBe(100);
    expect(result.gain).toBe(6);
  });

  it("treats a gain roll that totals zero as no gain", async () => {
    queue = [{ total: 88 }, { total: 0 }];

    const { result } = await resolveImprovement(buildRequest());

    expect(result.succeeded).toBe(true);
    expect(result.gain).toBe(0);
    expect(result.newValue).toBe(65);
  });
});
