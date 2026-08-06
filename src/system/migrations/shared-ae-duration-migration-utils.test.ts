import { describe, expect, it } from "vitest";
import { normalizeLegacyActiveEffectDuration } from "./shared-ae-duration-migration-utils";

describe("normalizeLegacyActiveEffectDuration", () => {
  it("normalizes seconds + startTime legacy fields", () => {
    const normalized = normalizeLegacyActiveEffectDuration({
      duration: {
        startTime: 123,
        seconds: 60,
      },
    });

    expect(normalized).toBeDefined();
    expect(normalized?.duration).toEqual({
      value: 60,
      units: "seconds",
      startTime: _del,
      seconds: _del,
      combat: _del,
      rounds: _del,
      turns: _del,
      startRound: _del,
      startTurn: _del,
    });
    expect(normalized?.start.time).toBe(123);
    expect(normalized?.start.round).toBeNull();
    expect(normalized?.start.turn).toBeNull();
  });

  it("normalizes rounds when seconds are absent", () => {
    const normalized = normalizeLegacyActiveEffectDuration({
      duration: {
        rounds: 10,
        startRound: 3,
        startTurn: 1,
      },
    });

    expect(normalized).toBeDefined();
    expect(normalized?.duration).toEqual({
      value: 10,
      units: "rounds",
      startTime: _del,
      seconds: _del,
      combat: _del,
      rounds: _del,
      turns: _del,
      startRound: _del,
      startTurn: _del,
    });
    expect(normalized?.start.round).toBe(3);
    expect(normalized?.start.turn).toBe(1);
  });

  it("returns undefined for already-normalized v14 duration", () => {
    const normalized = normalizeLegacyActiveEffectDuration({
      duration: {
        value: 5,
        units: "rounds",
      },
      start: {
        time: 0,
        round: null,
        turn: null,
      },
    });

    expect(normalized).toBeUndefined();
  });

  it("returns undefined when legacy keys are only Foundry's deprecation getters", () => {
    // Foundry v14 keeps the deprecated duration keys readable via getters that
    // derive from the new value/units/start fields, so they report data forever
    // and can never be deleted. A prior bug treated those shims as real legacy
    // data, so already-migrated documents were re-migrated on every pass and
    // kept reappearing under "Performed migrations". See issue #984.
    const duration: Record<string, unknown> = { value: 10, units: "turns" };
    const start = { time: 41254758748, round: 9, turn: 5, combat: "e0ZOFZUjkzNg87KS" };
    Object.defineProperties(duration, {
      startTime: { get: () => start.time, enumerable: true },
      seconds: { get: () => null, enumerable: true },
      combat: { get: () => start.combat, enumerable: true },
      rounds: { get: () => null, enumerable: true },
      turns: { get: () => duration["value"], enumerable: true },
      startRound: { get: () => start.round, enumerable: true },
      startTurn: { get: () => start.turn, enumerable: true },
    });

    expect(normalizeLegacyActiveEffectDuration({ duration, start })).toBeUndefined();
  });

  it("reads raw stored data from _source rather than the initialized document", () => {
    const normalized = normalizeLegacyActiveEffectDuration({
      _source: { duration: { seconds: 60, startTime: 123 } },
      duration: { value: 60, units: "seconds" },
    });

    expect(normalized?.duration.value).toBe(60);
    expect(normalized?.duration.units).toBe("seconds");
    expect(normalized?.start.time).toBe(123);
  });
});
