import { describe, expect, it } from "vitest";

import {
  buildSkillExperienceRollFormula,
  configureAdapterForAbilityItem,
  formatCategoryModDisplay,
  getGateThreshold,
  isSupportedAbilityGainType,
  updateAdapterForSkill,
} from "./improve-ability-dialog";

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

describe("buildSkillExperienceRollFormula", () => {
  it("builds formula for positive category modifiers", () => {
    expect(buildSkillExperienceRollFormula(15)).toBe("1d100+15[category mod]");
  });

  it("builds formula for negative category modifiers", () => {
    expect(buildSkillExperienceRollFormula(-5)).toBe("1d100-5[category mod]");
  });

  it("builds formula for zero category modifier", () => {
    expect(buildSkillExperienceRollFormula(0)).toBe("1d100");
  });
});

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
  it("allows training a skill just below 75%", () => {
    const improvementData = createImprovementData();
    updateAdapterForSkill(improvementData, createSkillItem(74));
    expect(improvementData.canTraining).toBe(true);
    expect(improvementData.skillOver75).toBeUndefined();
  });

  it("blocks training a skill at exactly 75%", () => {
    const improvementData = createImprovementData();
    updateAdapterForSkill(improvementData, createSkillItem(75));
    expect(improvementData.canTraining).toBe(false);
    expect(improvementData.skillOver75).toBe(true);
  });

  it("blocks training a skill above 75%", () => {
    const improvementData = createImprovementData();
    updateAdapterForSkill(improvementData, createSkillItem(80));
    expect(improvementData.canTraining).toBe(false);
    expect(improvementData.skillOver75).toBe(true);
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
  it("returns true for supported gain types", () => {
    expect(isSupportedAbilityGainType("experience-gain-fixed")).toBe(true);
    expect(isSupportedAbilityGainType("experience-gain-random")).toBe(true);
    expect(isSupportedAbilityGainType("research-gain-fixed")).toBe(true);
    expect(isSupportedAbilityGainType("research-gain-random")).toBe(true);
    expect(isSupportedAbilityGainType("training-gain-fixed")).toBe(true);
    expect(isSupportedAbilityGainType("training-gain-random")).toBe(true);
  });

  it("returns false for empty or unknown gain types", () => {
    expect(isSupportedAbilityGainType("")).toBe(false);
    expect(isSupportedAbilityGainType("not-a-gain-type")).toBe(false);
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

  it("disallows research and training for passions", () => {
    const improvementData = createImprovementData();
    const passionItem = { type: "passion" } as any;
    configureAdapterForAbilityItem(improvementData, passionItem);
    expect(improvementData.showResearch).toBe(false);
    expect(improvementData.canResearch).toBe(false);
    expect(improvementData.showTraining).toBe(false);
    expect(improvementData.canTraining).toBe(false);
  });
});
