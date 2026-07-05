import { describe, expect, it } from "vitest";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { migrateActorActiveEffectDurationUnits } from "./migrate-actor-active-effect-duration-units";

describe("migrateActorActiveEffectDurationUnits", () => {
  it("migrates legacy actor effect duration to value + units", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
      effects: [
        {
          id: "effect-1",
          duration: {
            startTime: 100,
            seconds: 30,
            combat: null,
            rounds: null,
            turns: null,
            startRound: null,
            startTurn: null,
          },
        },
      ],
    };

    const updateData = migrateActorActiveEffectDurationUnits(mockActor as unknown as RqgActor);
    const migratedEffect = (updateData.effects as any[])?.[0];

    expect(migratedEffect.duration.value).toBe(30);
    expect(migratedEffect.duration.units).toBe("seconds");
    expect(migratedEffect.start.time).toBe(100);
  });

  it("returns no updates when actor effects are already v14 format", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
      effects: [
        {
          id: "effect-1",
          duration: { value: 2, units: "rounds" },
          start: { time: 0, round: null, turn: null, combat: null },
        },
      ],
    };

    const updateData = migrateActorActiveEffectDurationUnits(mockActor as unknown as RqgActor);
    expect(updateData.effects).toBeUndefined();
  });
});
