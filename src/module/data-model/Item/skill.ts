import {IAbility} from "../shared/ability";

export enum SkillCategoryEnum {
  Agility,
  Communication,
  Knowledge,
  Magic,
  Manipulation,
  Perception,
  Stealth,
  MeleeWeapons,
  MissileWeapons,
  Shields,
  NaturalWaeapons,
  OtherSkills
}

export type SkillData = IAbility & {
  category: SkillCategoryEnum;
  baseChance: number;
}

export const emptySkill: SkillData = {
  category: SkillCategoryEnum.Agility,
  value: 0,
  baseChance: 0,
  experience: false
};
