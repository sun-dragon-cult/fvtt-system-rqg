import { beforeEach, describe, expect, it, vi } from "vitest";

import { CultRankEnum } from "@item-model/cultDataModel.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { buildCharacteristicAdapter } from "./improve-characteristic-dialog";

function createActorWithSourceCharacteristic(
  characteristicName: string,
  characteristic: { value: number; hasExperience?: boolean; formula: string },
  items: unknown[] = [],
) {
  return {
    items,
    _source: {
      system: {
        characteristics: {
          [characteristicName]: characteristic,
        },
      },
    },
  } as any;
}

describe("buildCharacteristicAdapter", () => {
  beforeEach(() => {
    const evaluate = vi.fn(async () => ({ total: 18 }));
    const evaluateSync = vi.fn(() => ({ total: 18 }));
    vi.stubGlobal("Roll", {
      create: vi.fn(() => ({ evaluate, evaluateSync })),
    });
  });

  it("enables power experience and training, but not research", async () => {
    const actor = createActorWithSourceCharacteristic("power", {
      value: 14,
      hasExperience: true,
      formula: "3d6+6",
    });

    const adapter = await buildCharacteristicAdapter(actor, "power");

    expect(adapter.showExperience).toBe(true);
    expect(adapter.showTraining).toBe(true);
    expect(adapter.showResearch).toBe(false);
    expect(adapter.canExperience).toBe(true);
    expect(adapter.canTraining).toBe(true);
    expect(adapter.canResearch).toBe(false);
  });

  it("does not allow experience for non-power characteristics", async () => {
    const actor = createActorWithSourceCharacteristic("strength", {
      value: 12,
      hasExperience: true,
      formula: "3d6+6",
    });

    const adapter = await buildCharacteristicAdapter(actor, "strength");

    expect(adapter.showExperience).toBe(false);
    expect(adapter.canExperience).toBe(false);
    expect(adapter.showTraining).toBe(true);
    expect(adapter.showResearch).toBe(true);
    expect(adapter.canTraining).toBe(true);
    expect(adapter.canResearch).toBe(true);
  });

  it("applies 20% cult bonus for qualifying power cult rank", async () => {
    const actor = createActorWithSourceCharacteristic(
      "power",
      {
        value: 14,
        hasExperience: true,
        formula: "3d6+6",
      },
      [
        {
          type: ItemTypeEnum.Cult,
          system: {
            joinedCults: [{ rank: CultRankEnum.RunePriest }],
          },
        },
      ],
    );

    const adapter = await buildCharacteristicAdapter(actor, "power");

    expect(adapter.speciesMax).toBe(22);
    expect(adapter.cultBonusValue).toBe(20);
    expect(adapter.cultBonusLabel).toContain(
      `RQG.Actor.RuneMagic.CultRank.${CultRankEnum.RunePriest}`,
    );
    expect(adapter.chanceToGain).toBe((22 - 14) * 5 + 20);
  });

  it("disables all improvement sources at or above species max", async () => {
    const actor = createActorWithSourceCharacteristic(
      "power",
      {
        value: 22,
        hasExperience: true,
        formula: "3d6+6",
      },
      [
        {
          type: ItemTypeEnum.Cult,
          system: {
            joinedCults: [{ rank: CultRankEnum.GodTalker }],
          },
        },
      ],
    );

    const adapter = await buildCharacteristicAdapter(actor, "power");

    expect(adapter.atSpeciesMax).toBe(true);
    expect(adapter.canExperience).toBe(false);
    expect(adapter.canTraining).toBe(false);
    expect(adapter.canResearch).toBe(false);
  });

  describe("with Active Effect modifier", () => {
    it("uses source value for chance and display", async () => {
      const actor = createActorWithSourceCharacteristic("strength", {
        value: 10, // source/base value
        hasExperience: false,
        formula: "3d6",
      });

      const adapter = await buildCharacteristicAdapter(actor, "strength");

      expect(adapter.chance).toBe(10);
      expect(adapter.currentValueDisplay).toBe("10");
      // speciesMax for 3d6: rollmax mock=18, speciesMin=diceCount(3)=3 -> speciesMax=21
      expect(adapter.chanceToGain).toBe((21 - 10) * 5);
    });

    it("does not mark as atSpeciesMax when source value is below species max", async () => {
      const actor = createActorWithSourceCharacteristic("strength", {
        value: 10, // source/base value
        hasExperience: false,
        formula: "3d6",
      });

      const adapter = await buildCharacteristicAdapter(actor, "strength");

      expect(adapter.atSpeciesMax).toBeUndefined();
      expect(adapter.canTraining).toBe(true);
      expect(adapter.canResearch).toBe(true);
    });
  });
});
