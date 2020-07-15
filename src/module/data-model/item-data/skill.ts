import { IAbility } from "../shared/ability";

export enum SkillCategoryEnum {
  Agility = "Agility",
  Communication = "Communication",
  Knowledge = "Knowledge",
  Magic = "Magic",
  Manipulation = "Manipulation",
  Perception = "Perception",
  Stealth = "Stealth",
  MeleeWeapons = "MeleeWeapons",
  MissileWeapons = "MissileWeapons",
  Shields = "Shields",
  NaturalWeapons = "NaturalWeapons",
  OtherSkills = "OtherSkills",
}

export type SkillData = IAbility & {
  category: SkillCategoryEnum;
  baseChance: number;
};

export const emptySkill: SkillData = {
  category: SkillCategoryEnum.Agility,
  baseChance: 0,
  value: 0,
  experience: false,
};
