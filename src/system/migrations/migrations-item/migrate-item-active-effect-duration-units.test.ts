import { describe, expect, it } from "vitest";
import type { RqgItem } from "@items/rqg-item.ts";
import { migrateItemActiveEffectDurationUnits } from "./migrate-item-active-effect-duration-units";

describe("migrateItemActiveEffectDurationUnits", () => {
  it("migrates legacy item effect duration to value + units", async () => {
    const mockItem = {
      name: "Test Item",
      id: "item-1",
      effects: [
        {
          id: "effect-1",
          duration: {
            startTime: 0,
            seconds: null,
            combat: null,
            rounds: 10,
            turns: null,
            startRound: 3,
            startTurn: 1,
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectDurationUnits(mockItem as unknown as RqgItem);
    const migratedEffect = (updateData.effects as any[])?.[0];

    expect(migratedEffect.duration.value).toBe(10);
    expect(migratedEffect.duration.units).toBe("rounds");
    expect(migratedEffect.start.round).toBe(3);
    expect(migratedEffect.start.turn).toBe(1);
  });

  it("returns no updates when no legacy duration fields are present", async () => {
    const mockItem = {
      name: "Test Item",
      id: "item-1",
      effects: [
        {
          id: "effect-1",
          duration: { value: 1, units: "turns" },
          start: { time: 0, round: null, turn: 1, combat: null },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectDurationUnits(mockItem as unknown as RqgItem);
    expect(updateData.effects).toBeUndefined();
  });
});
