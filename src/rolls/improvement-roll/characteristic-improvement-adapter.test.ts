import { beforeEach, describe, expect, it, vi } from "vitest";

import { CultRankEnum } from "@item-model/cult-enums.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  buildCharacteristicAdapter,
  buildCharacteristicImprovementRequest,
} from "./characteristic-improvement-adapter";

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
    expect(adapter.trainingIsGated).toBe(true);
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
    expect(adapter.trainingIsGated).toBe(false);
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

describe("buildCharacteristicImprovementRequest", () => {
  const speaker = {} as ChatMessage.SpeakerData;

  function characteristicImprovementData(overrides: Partial<any> = {}) {
    return {
      shortName: "POW",
      name: "Power",
      typeLocName: "Characteristic",
      currentValueDisplay: "13",
      hasExperience: true,
      cultBonusValue: 0,
      cultBonusLabel: "",
      canExperience: true,
      canTraining: true,
      canResearch: false,
      showExperience: true,
      showTraining: true,
      showResearch: false,
      chance: 13,
      chanceToGain: 40,
      speciesMax: 21,
      experienceGainFixed: 1,
      experienceGainRandom: "1d3-1",
      trainingGainRandom: "1d3-1",
      researchGainRandom: "1d3-1",
      trainingIsGated: true,
      ...overrides,
    } as any;
  }

  it("maps experience to a roll-under gate against the improvement chance", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData(),
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.domain).toBe("characteristic");
    expect(request.valueSuffix).toBe("");
    expect(request.currentValue).toBe(13);
    expect(request.gate).toEqual({
      formula: "1d100",
      comparator: "roll-under",
      threshold: 40,
    });
    expect(request.gain).toEqual({ kind: "random", formula: "1d3-1" });
  });

  it("maps a fixed experience gain to a plain-number gain formula", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData(),
      "experience-gain-fixed",
      "Vasana",
      speaker,
    );

    expect(request.gain).toEqual({ kind: "fixed", formula: "1" });
  });

  it("gates POW training, which takes the same POW gain roll as experience (Core p.418)", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData({ trainingIsGated: true }),
      "training-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate).toMatchObject({ comparator: "roll-under", threshold: 40 });
  });

  it("leaves training on the other trainable characteristics ungated", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData({
        trainingIsGated: false,
        shortName: "DEX",
        name: "Dexterity",
      }),
      "training-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate).toBeUndefined();
    expect(request.gain).toEqual({ kind: "random", formula: "1d3-1" });
  });

  it("always gates research", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData({ trainingIsGated: false, canResearch: true }),
      "research-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate).toMatchObject({ comparator: "roll-under", threshold: 40 });
    expect(request.gain).toEqual({ kind: "random", formula: "1d3-1" });
  });

  it("explains chanceToGain as (species max - current) x 5 + cult bonus, matching the dialog's formula", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData({ cultBonusValue: 20, cultBonusLabel: "High Priest" }),
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gateBreakdownChips).toEqual([
      { label: "", value: "(" },
      { label: expect.stringContaining("speciesMaxLabel"), value: "21" },
      { label: "", value: "−" },
      { label: "POW", value: "13" },
      { label: "", value: ") × 5" },
      { label: "", value: "+" },
      { label: "High Priest", value: "20" },
    ]);
  });

  it("omits the cult bonus chips when there is none", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData(),
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gateBreakdownChips).toEqual([
      { label: "", value: "(" },
      { label: expect.stringContaining("speciesMaxLabel"), value: "21" },
      { label: "", value: "−" },
      { label: "POW", value: "13" },
      { label: "", value: ") × 5" },
    ]);
  });

  it("omits breakdown chips for an ungated request", () => {
    const request = buildCharacteristicImprovementRequest(
      characteristicImprovementData({
        trainingIsGated: false,
        shortName: "DEX",
        name: "Dexterity",
      }),
      "training-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gateBreakdownChips).toEqual([]);
  });
});
