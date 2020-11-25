import { IAbility } from "../shared/ability";

export enum SkillCategoryEnum {
  Agility = "agility",
  Communication = "communication",
  Knowledge = "knowledge",
  Magic = "magic",
  Manipulation = "manipulation",
  Perception = "perception",
  Stealth = "stealth",
  MeleeWeapons = "meleeWeapons",
  MissileWeapons = "missileWeapons",
  Shields = "shields",
  NaturalWeapons = "naturalWeapons",
  OtherSkills = "otherSkills",
}

export type SkillData = IAbility & {
  category: SkillCategoryEnum;
  skillName: string;
  specialization: string;
  baseChance: number;
  learnedChance: number;
  // --- Derived / Convenience Data Below ---
  chance?: number;
  categoryMod?: number;
  skillCategories?: SkillCategoryEnum[];
  isGM?: boolean;
};

export const emptySkill: SkillData = {
  category: SkillCategoryEnum.Agility,
  skillName: "",
  specialization: "",
  baseChance: 0,
  learnedChance: 0,
  experience: false,
};
