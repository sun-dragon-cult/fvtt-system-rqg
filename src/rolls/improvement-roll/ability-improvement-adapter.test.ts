import { describe, expect, it } from "vitest";

import {
  configureAdapterForAbilityItem,
  formatCategoryModDisplay,
  getGateThreshold,
  isSupportedAbilityGainType,
  updateAdapterForSkill,
  buildAbilityImprovementRequest,
} from "./ability-improvement-adapter";
import { evaluateImprovementGate } from "./evaluate-improvement-gate";

// Agility category mod == DEX's linearMod alone when STR/SIZ/POW sit in the flattenedMod(0) band
// (5-16): flattenedMod(str) - flattenedMod(siz) + linearMod(dex) + flattenedMod(pow).
// linearMod(dex) = (ceil(dex/4) - 3) * 5, so dex = (mod/5 + 3) * 4 inverts it exactly on multiples of 5.
function dexterityForAgilityMod(agilityMod: number): number {
  return (agilityMod / 5 + 3) * 4;
}

function createSkillItem(baseChance: number, gainedChance: number = 0, categoryMod: number = 0) {
  const neutral = { value: 13 }; // str/siz/pow in the flattenedMod(0) band
  return {
    type: "skill",
    system: { category: "agility" },
    _source: { system: { baseChance, gainedChance } },
    parent: {
      type: "character",
      _source: {
        system: {
          characteristics: {
            strength: neutral,
            constitution: neutral,
            size: neutral,
            dexterity: { value: dexterityForAgilityMod(categoryMod) },
            intelligence: neutral,
            power: neutral,
            charisma: neutral,
          },
          attributes: { isCreature: false },
        },
      },
    },
  } as any;
}

function createImprovementData() {
  return {
    showTraining: true,
    canTraining: true,
    showResearch: true,
    canResearch: true,
  } as any;
}

describe("formatCategoryModDisplay", () => {
  it("formats positive category modifiers", () => {
    expect(formatCategoryModDisplay(15)).toBe("+15");
  });

  it("formats negative category modifiers", () => {
    expect(formatCategoryModDisplay(-5)).toBe("-5");
  });

  it("formats zero category modifier", () => {
    expect(formatCategoryModDisplay(0)).toBe("0");
  });
});

describe("updateAdapterForSkill", () => {
  describe("75%+ training/research gate (Core p.416, p.417)", () => {
    // The 75%-plus restriction (Core p.416, p.417) only applies to skills that can gain
    // Experience at all (canGetExperience) - a skill that can't (e.g. Alchemy, Farm) has no
    // alternative path and stays trainable/researchable past 75%.
    it.each`
      description                                           | chance | canGetExperience | expectedAllowed | expectedSkillOver75
      ${"below 75%, no experience box: allowed"}            | ${74}  | ${false}         | ${true}         | ${undefined}
      ${"below 75%, with an experience box: still allowed"} | ${74}  | ${true}          | ${true}         | ${undefined}
      ${"at 75% with an experience box: blocked"}           | ${75}  | ${true}          | ${false}        | ${true}
      ${"above 75% with an experience box: blocked"}        | ${80}  | ${true}          | ${false}        | ${true}
      ${"above 75% with no experience box: still allowed"}  | ${80}  | ${false}         | ${true}         | ${undefined}
    `("$description", ({ chance, canGetExperience, expectedAllowed, expectedSkillOver75 }) => {
      const improvementData = createImprovementData();
      improvementData.canGetExperience = canGetExperience;
      updateAdapterForSkill(improvementData, createSkillItem(chance));
      expect(improvementData.canTraining).toBe(expectedAllowed);
      expect(improvementData.canResearch).toBe(expectedAllowed);
      expect(improvementData.skillOver75).toBe(expectedSkillOver75);
    });
  });

  it("derives the category modifier from source characteristics, ignoring active-effect deltas", () => {
    // A live characteristic value shifted by an active effect (e.g. a DEX-draining status effect)
    // must not change the category mod used for this gate roll: only actor._source is honored.
    const item = createSkillItem(40, 0, 15);
    item.parent.system = {
      // Live/prepared data an active effect could have overwritten, e.g. dropping DEX far enough
      // to fall out of the category mod band that the unmodified DEX 21 sits in.
      baseSkillCategoryModifiers: { agility: -5 },
      characteristics: { dexterity: { value: 5 } },
    };
    const improvementData = createImprovementData();
    updateAdapterForSkill(improvementData, item);
    expect(improvementData.categoryMod).toBe(15);
  });
});

describe("getGateThreshold", () => {
  it("uses the unmodified skill value for skills, not the category-modified chance", () => {
    const improvementData = createImprovementData();
    // baseChance 40 + categoryMod 15 -> chance 55, but the gate threshold must stay at
    // the unmodified 40, since the roll formula already adds the category mod itself.
    updateAdapterForSkill(improvementData, createSkillItem(40, 0, 15));
    expect(improvementData.chance).toBe(55);
    expect(getGateThreshold(improvementData)).toBe(40);
  });

  it("uses the plain chance for Runes/Passions, which get no category modifier", () => {
    const improvementData = createImprovementData();
    improvementData.abilityType = "rune";
    improvementData.chance = 30;
    expect(getGateThreshold(improvementData)).toBe(30);
  });
});

describe("isSupportedAbilityGainType", () => {
  it.each`
    gainType                    | expected
    ${"experience-gain-fixed"}  | ${true}
    ${"experience-gain-random"} | ${true}
    ${"research-gain-fixed"}    | ${true}
    ${"research-gain-random"}   | ${true}
    ${"training-gain-fixed"}    | ${true}
    ${"training-gain-random"}   | ${true}
    ${""}                       | ${false}
    ${"not-a-gain-type"}        | ${false}
  `('"$gainType" -> $expected', ({ gainType, expected }) => {
    expect(isSupportedAbilityGainType(gainType)).toBe(expected);
  });
});

describe("configureAdapterForAbilityItem", () => {
  it("allows research for skills", () => {
    const improvementData = createImprovementData();
    configureAdapterForAbilityItem(improvementData, createSkillItem(50));
    expect(improvementData.showResearch).toBe(true);
    expect(improvementData.canResearch).toBe(true);
  });

  it("allows research for runes", () => {
    const improvementData = createImprovementData();
    const runeItem = { type: "rune", system: { rune: "Fire" } } as any;
    configureAdapterForAbilityItem(improvementData, runeItem);
    expect(improvementData.showResearch).toBe(true);
    expect(improvementData.canResearch).toBe(true);
  });

  it("blocks training and research for a Rune at 75%+ that can gain experience (Core p.416, p.417)", () => {
    // The 75%-plus restriction is worded generically ("any ability listed on the adventurer
    // sheet"), not skill-specific, and Core p.417 gives a worked Rune-training example
    // (Sorala's Air Rune) - so Runes are gated identically to Skills.
    const improvementData = createImprovementData();
    improvementData.chance = 80;
    improvementData.canGetExperience = true;
    const runeItem = { type: "rune", system: { rune: "Fire" } } as any;
    configureAdapterForAbilityItem(improvementData, runeItem);
    expect(improvementData.canTraining).toBe(false);
    expect(improvementData.canResearch).toBe(false);
    expect(improvementData.skillOver75).toBe(true);
  });

  it("allows training and research for a Rune at 75%+ that cannot gain experience", () => {
    const improvementData = createImprovementData();
    improvementData.chance = 80;
    improvementData.canGetExperience = false;
    const runeItem = { type: "rune", system: { rune: "Fire" } } as any;
    configureAdapterForAbilityItem(improvementData, runeItem);
    expect(improvementData.canTraining).toBe(true);
    expect(improvementData.canResearch).toBe(true);
    expect(improvementData.skillOver75).toBeUndefined();
  });

  it("disallows research and training for passions", () => {
    const improvementData = createImprovementData();
    const passionItem = { type: "passion" } as any;
    configureAdapterForAbilityItem(improvementData, passionItem);
    expect(improvementData.showResearch).toBe(false);
    expect(improvementData.canResearch).toBe(false);
    expect(improvementData.showTraining).toBe(false);
    expect(improvementData.canTraining).toBe(false);
  });

  it("blocks every improvement source for a Rune at 100%, unlike Skills/Passions (Core p.415)", () => {
    // Certain non-human entities sit exactly at 100% as a natural rating (e.g. Wraiths'
    // Death 100%) - Runes cannot normally be pushed past that ceiling by any source.
    const improvementData = createImprovementData();
    improvementData.chance = 100;
    improvementData.canGetExperience = true;
    improvementData.canExperience = true;
    const runeItem = { type: "rune", system: { rune: "Death" } } as any;
    configureAdapterForAbilityItem(improvementData, runeItem);
    expect(improvementData.canExperience).toBe(false);
    expect(improvementData.canResearch).toBe(false);
    expect(improvementData.canTraining).toBe(false);
    expect(improvementData.atRuneCap).toBe(true);
  });

  it("does not cap a Rune below 100%", () => {
    const improvementData = createImprovementData();
    improvementData.chance = 99;
    improvementData.canGetExperience = true;
    improvementData.canExperience = true;
    const runeItem = { type: "rune", system: { rune: "Death" } } as any;
    configureAdapterForAbilityItem(improvementData, runeItem);
    expect(improvementData.canExperience).toBe(true);
    expect(improvementData.atRuneCap).toBeUndefined();
  });
});

describe("buildAbilityImprovementRequest", () => {
  const speaker = {} as ChatMessage.SpeakerData;

  function skillImprovementData(overrides: Partial<any> = {}) {
    const improvementData = createImprovementData();
    updateAdapterForSkill(improvementData, createSkillItem(40, 0, 15));
    Object.assign(improvementData, {
      name: "Dodge",
      typeLocName: "Skill",
      img: "icons/dodge.webp",
      currentValueDisplay: "55%",
      experienceGainFixed: 3,
      experienceGainRandom: "1d6",
      researchGainFixed: 1,
      researchGainRandom: "1d6-2",
      trainingGainFixed: 2,
      trainingGainRandom: "1d6-1",
      ...overrides,
    });
    return improvementData;
  }

  it("maps experience on a skill to a roll-over gate with the category mod folded into the threshold", () => {
    const request = buildAbilityImprovementRequest(
      skillImprovementData(),
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.domain).toBe("ability");
    expect(request.source).toBe("experience");
    expect(request.valueSuffix).toBe("%");
    expect(request.currentValue).toBe(55);
    // Skill value 40, category mod +15 -> threshold 25, so the roll stays a plain 1-100 value
    // instead of a die+mod total that could read above 100.
    expect(request.gate).toEqual({
      formula: "1d100",
      comparator: "roll-over",
      threshold: 25,
      naturalHundredAlwaysSucceeds: true,
    });
    expect(request.gain).toEqual({ kind: "random", formula: "1d6" });
  });

  it("explains the threshold as a skill-value/category-mod breakdown", () => {
    const request = buildAbilityImprovementRequest(
      skillImprovementData(),
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gateBreakdownChips).toEqual([
      { label: expect.stringContaining("skillValueLabel"), value: "40" },
      { label: "", value: "−" },
      { label: expect.stringContaining("categoryModifierLabel"), value: "15" },
    ]);
  });

  it("flips the breakdown connector for a negative category mod", () => {
    const improvementData = skillImprovementData();
    improvementData.categoryMod = -10;

    const request = buildAbilityImprovementRequest(
      improvementData,
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate?.threshold).toBe(50); // 40 - (-10)
    expect(request.gateBreakdownChips).toEqual([
      { label: expect.stringContaining("skillValueLabel"), value: "40" },
      { label: "", value: "+" },
      { label: expect.stringContaining("categoryModifierLabel"), value: "10" },
    ]);
  });

  it("still shows the base skill-value chip when there is no category modifier to adjust it", () => {
    const improvementData = skillImprovementData();
    improvementData.categoryMod = 0;

    const request = buildAbilityImprovementRequest(
      improvementData,
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate?.threshold).toBe(40);
    expect(request.gateBreakdownChips).toEqual([
      { label: expect.stringContaining("skillValueLabel"), value: "40" },
    ]);
  });

  it("maps a fixed research gain to a plain-number gain formula", () => {
    const request = buildAbilityImprovementRequest(
      skillImprovementData(),
      "research-gain-fixed",
      "Vasana",
      speaker,
    );

    expect(request.source).toBe("research");
    expect(request.gain).toEqual({ kind: "fixed", formula: "1" });
    expect(request.gate?.comparator).toBe("roll-over");
  });

  it("maps training to an ungated request - training never rolls to see if it took", () => {
    const request = buildAbilityImprovementRequest(
      skillImprovementData(),
      "training-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.source).toBe("training");
    expect(request.gate).toBeUndefined();
    expect(request.gain).toEqual({ kind: "random", formula: "1d6-1" });
  });

  it("still grants runes the natural-100 exception, even though they take no category mod", () => {
    // Runes/Passions take no category mod, so their gate is already a plain unmodified 1d100 -
    // but they still need the natural-100 exception, since Passions routinely reach/exceed 100%
    // (Core p.415-416) and would otherwise become permanently un-improvable via Experience.
    const improvementData = createImprovementData();
    improvementData.abilityType = "rune";
    improvementData.typeLocName = "Rune";
    improvementData.chance = 30;

    const request = buildAbilityImprovementRequest(
      improvementData,
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate).toMatchObject({
      formula: "1d100",
      threshold: 30,
      naturalHundredAlwaysSucceeds: true,
    });
    // Runes get no category-mod adjustment, but the headline target still gets a labeled chip
    // explaining what it is - not left as a bare, unexplained number.
    expect(request.gateBreakdownChips).toEqual([{ label: "Rune", value: "30" }]);
  });

  it("caps the threshold at 99 for a Passion that has already exceeded 100%", () => {
    // No category mod for Passions, so the same 99-cap that keeps skills honest also applies
    // here: threshold 115 would require an impossible >115 roll, while 99 (only a natural 100
    // succeeds) is exactly equivalent in outcome and renders as a legible ">99" target.
    const improvementData = createImprovementData();
    improvementData.abilityType = "passion";
    improvementData.typeLocName = "Passion";
    improvementData.chance = 115;

    const request = buildAbilityImprovementRequest(
      improvementData,
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate).toEqual({
      formula: "1d100",
      comparator: "roll-over",
      threshold: 99,
      naturalHundredAlwaysSucceeds: true,
    });
    // The breakdown chip must show the same capped value as the headline threshold (99), not the
    // pre-cap chance (115) - otherwise the tooltip would contradict the number shown above it.
    expect(request.gateBreakdownChips).toEqual([{ label: "Passion", value: "99" }]);
  });

  it("caps a Rune's gain at 100%, but leaves Skills/Passions with no such ceiling", () => {
    const runeRequest = buildAbilityImprovementRequest(
      { ...createImprovementData(), abilityType: "rune", typeLocName: "Rune", chance: 98 },
      "experience-gain-random",
      "Vasana",
      speaker,
    );
    expect(runeRequest.maxValue).toBe(100);

    const skillRequest = buildAbilityImprovementRequest(
      skillImprovementData(),
      "experience-gain-random",
      "Vasana",
      speaker,
    );
    expect(skillRequest.maxValue).toBeUndefined();

    const passionRequest = buildAbilityImprovementRequest(
      { ...createImprovementData(), abilityType: "passion", typeLocName: "Passion", chance: 98 },
      "experience-gain-random",
      "Vasana",
      speaker,
    );
    expect(passionRequest.maxValue).toBeUndefined();
  });

  it("gives Passions the same labeled base chip, since they take no category mod either", () => {
    const improvementData = createImprovementData();
    improvementData.abilityType = "passion";
    improvementData.typeLocName = "Passion";
    improvementData.chance = 36;

    const request = buildAbilityImprovementRequest(
      improvementData,
      "experience-gain-random",
      "Vasana",
      speaker,
    );

    expect(request.gate).toMatchObject({ formula: "1d100", threshold: 36 });
    expect(request.gateBreakdownChips).toEqual([{ label: "Passion", value: "36" }]);
  });

  describe("gate success-outcome matrix", () => {
    function gateScenarioData(
      abilityType: "skill" | "rune" | "passion",
      baseValue: number,
      categoryMod = 0,
    ): any {
      return {
        abilityType,
        typeLocName: abilityType,
        name: "Test",
        chance: abilityType === "skill" ? baseValue + categoryMod : baseValue,
        skillChance: baseValue,
        categoryMod: abilityType === "skill" ? categoryMod : undefined,
      };
    }

    it.each`
      description                                                                    | abilityType  | baseValue | categoryMod | rollTotal | expectedSucceeded
      ${"skill, positive mod: fails at the threshold (40 - 15 = 25)"}                | ${"skill"}   | ${40}     | ${15}       | ${25}     | ${false}
      ${"skill, positive mod: succeeds just above the threshold"}                    | ${"skill"}   | ${40}     | ${15}       | ${26}     | ${true}
      ${"skill, base >=100 + positive mod: succeeds in the modified-100+ band"}      | ${"skill"}   | ${105}    | ${10}       | ${90}     | ${true}
      ${"skill, base >=100 + positive mod: fails just below that band"}              | ${"skill"}   | ${105}    | ${10}       | ${89}     | ${false}
      ${"skill, heavily negative mod: natural 100 succeeds despite threshold >=100"} | ${"skill"}   | ${90}     | ${-15}      | ${100}    | ${true}
      ${"skill, heavily negative mod: a near-max non-natural roll still fails"}      | ${"skill"}   | ${90}     | ${-15}      | ${99}     | ${false}
      ${"rune, under 100%: ordinary roll-over"}                                      | ${"rune"}    | ${30}     | ${0}        | ${31}     | ${true}
      ${"rune, at/above 100%: a natural 100 succeeds"}                               | ${"rune"}    | ${115}    | ${0}        | ${100}    | ${true}
      ${"rune, at/above 100%: a 99 still fails"}                                     | ${"rune"}    | ${115}    | ${0}        | ${99}     | ${false}
      ${"passion, at/above 100%: a natural 100 succeeds"}                            | ${"passion"} | ${120}    | ${0}        | ${100}    | ${true}
    `("$description", ({ abilityType, baseValue, categoryMod, rollTotal, expectedSucceeded }) => {
      const request = buildAbilityImprovementRequest(
        gateScenarioData(abilityType, baseValue, categoryMod),
        "experience-gain-random",
        "Vasana",
        speaker,
      );

      expect(evaluateImprovementGate(request.gate!, rollTotal)).toBe(expectedSucceeded);
    });
  });
});
