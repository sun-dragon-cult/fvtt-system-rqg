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
});
