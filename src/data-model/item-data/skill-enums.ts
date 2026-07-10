/**
 * Pure enum/const definitions for skill-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const SkillCategoryEnum = {
  Agility: "agility",
  Communication: "communication",
  Knowledge: "knowledge",
  Magic: "magic",
  Manipulation: "manipulation",
  Perception: "perception",
  Stealth: "stealth",
  MeleeWeapons: "meleeWeapons",
  MissileWeapons: "missileWeapons",
  Shields: "shields",
  NaturalWeapons: "naturalWeapons",
  OtherSkills: "otherSkills",
} as const;
export type SkillCategoryEnum = (typeof SkillCategoryEnum)[keyof typeof SkillCategoryEnum];
