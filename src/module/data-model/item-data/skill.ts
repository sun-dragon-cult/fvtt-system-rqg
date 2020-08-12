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
  baseChance: number;
  learnedChance: number;
};

export const emptySkill: SkillData = {
  category: SkillCategoryEnum.Agility,
  baseChance: 0,
  learnedChance: 0,
  experience: false,
};
