import { beforeEach, describe, expect, it, vi } from "vitest";

import { CultRankEnum } from "@item-model/cult-enums.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import {
  buildCharacteristicAdapter,
  buildCharacteristicImprovementRequest,
  isSupportedCharacteristicGainType,
} from "./characteristic-improvement-adapter";
import { evaluateImprovementGate } from "./evaluate-improvement-gate";

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

  describe("per-characteristic improvement-source eligibility", () => {
    const trainableResearchable = {
      showExperience: false,
      canExperience: false,
      showTraining: true,
      canTraining: true,
      showResearch: true,
      canResearch: true,
      trainingIsGated: false,
    };
    const locked = {
      showExperience: false,
      canExperience: false,
      showTraining: false,
      canTraining: false,
      showResearch: false,
      canResearch: false,
      trainingIsGated: false,
    };

    it.each`
      description                                                    | characteristicName | expected
      ${"power: experience+training gated by POW-roll, no research"} | ${"power"}         | ${{ showExperience: true, canExperience: true, showTraining: true, canTraining: true, showResearch: false, canResearch: false, trainingIsGated: true }}
      ${"strength: trainable/researchable, no experience"}           | ${"strength"}      | ${trainableResearchable}
      ${"constitution: trainable/researchable, no experience"}       | ${"constitution"}  | ${trainableResearchable}
      ${"dexterity: trainable/researchable, no experience"}          | ${"dexterity"}     | ${trainableResearchable}
      ${"charisma: trainable/researchable, no experience"}           | ${"charisma"}      | ${trainableResearchable}
      ${"size: cannot be improved by any source"}                    | ${"size"}          | ${locked}
      ${"intelligence: cannot be improved by any source"}            | ${"intelligence"}  | ${locked}
    `("$description", async ({ characteristicName, expected }) => {
      const actor = createActorWithSourceCharacteristic(characteristicName, {
        value: 10,
        hasExperience: true,
        formula: "3d6",
      });

      const adapter = await buildCharacteristicAdapter(actor, characteristicName);

      expect(adapter).toMatchObject(expected);
    });
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

describe("isSupportedCharacteristicGainType", () => {
  // Unlike abilities, only Experience has a fixed-gain option here - Training/Research are
  // always random for characteristics, so their "-gain-fixed" variants are deliberately absent.
  it.each`
    gainType                    | expected
    ${"experience-gain-fixed"}  | ${true}
    ${"experience-gain-random"} | ${true}
    ${"training-gain-random"}   | ${true}
    ${"research-gain-random"}   | ${true}
    ${"training-gain-fixed"}    | ${false}
    ${"research-gain-fixed"}    | ${false}
    ${""}                       | ${false}
    ${"not-a-gain-type"}        | ${false}
  `('"$gainType" -> $expected', ({ gainType, expected }) => {
    expect(isSupportedCharacteristicGainType(gainType)).toBe(expected);
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

  describe("gate success-outcome matrix", () => {
    it.each`
      description                                                   | gainType                    | trainingIsGated | rollTotal | expectedSucceeded
      ${"experience: succeeds at/under chanceToGain (roll-under)"}  | ${"experience-gain-random"} | ${true}         | ${40}     | ${true}
      ${"experience: fails just above chanceToGain"}                | ${"experience-gain-random"} | ${true}         | ${41}     | ${false}
      ${"research: always gated, succeeds at/under chanceToGain"}   | ${"research-gain-random"}   | ${false}        | ${40}     | ${true}
      ${"POW training (gated): fails above chanceToGain"}           | ${"training-gain-random"}   | ${true}         | ${41}     | ${false}
      ${"other-characteristic training (ungated): always succeeds"} | ${"training-gain-random"}   | ${false}        | ${99}     | ${true}
    `("$description", ({ gainType, trainingIsGated, rollTotal, expectedSucceeded }) => {
      const request = buildCharacteristicImprovementRequest(
        characteristicImprovementData({ trainingIsGated }),
        gainType,
        "Vasana",
        speaker,
      );

      const succeeded = request.gate ? evaluateImprovementGate(request.gate, rollTotal) : true; // no gate at all means the source always gains, matching resolveImprovement.

      expect(succeeded).toBe(expectedSucceeded);
    });
  });
});
