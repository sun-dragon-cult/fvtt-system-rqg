import { describe, expect, it } from "vitest";

import {
  buildSkillExperienceRollFormula,
  formatCategoryModDisplay,
  isSupportedAbilityGainType,
  updateAdapterForSkill,
} from "./improve-ability-dialog";

function createSkillItem(baseChance: number, gainedChance: number = 0) {
  return {
    type: "skill",
    system: { category: "agility" },
    _source: { system: { baseChance, gainedChance } },
    parent: { type: "character", system: { baseSkillCategoryModifiers: { agility: 0 } } },
  } as any;
}

function createImprovementData() {
  return { canTraining: true } as any;
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
});

describe("isSupportedAbilityGainType", () => {
  it("returns true for supported gain types", () => {
    expect(isSupportedAbilityGainType("experience-gain-fixed")).toBe(true);
    expect(isSupportedAbilityGainType("experience-gain-random")).toBe(true);
    expect(isSupportedAbilityGainType("training-gain-fixed")).toBe(true);
    expect(isSupportedAbilityGainType("training-gain-random")).toBe(true);
  });

  it("returns false for empty or unknown gain types", () => {
    expect(isSupportedAbilityGainType("")).toBe(false);
    expect(isSupportedAbilityGainType("research-gain-random")).toBe(false);
    expect(isSupportedAbilityGainType("not-a-gain-type")).toBe(false);
  });
});
