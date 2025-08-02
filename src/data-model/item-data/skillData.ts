import type { IAbility } from "../shared/ability";
import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";

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

export interface SkillDataSourceData extends IAbility {
  descriptionRqidLink: RqidLink | undefined;
  category: SkillCategoryEnum;
  skillName: string;
  specialization: string;
  baseChance: number;
  gainedChance: number;
  /** For Sorcery Magic */
  runeRqidLinks: RqidLink[];
}

// --- Derived Data ---
export interface SkillDataPropertiesData extends SkillDataSourceData {
  /** Derived: Base chance + Gained chance + categoryMod (from IAbility) */
  chance: number;
  /** Derived: The modifier from skill category for this skill*/
  categoryMod: number;
}

export interface SkillDataSource {
  type: ItemTypeEnum.Skill;
  system: SkillDataSourceData;
}

export interface SkillDataProperties {
  type: ItemTypeEnum.Skill;
  system: SkillDataPropertiesData;
}

export const defaultSkillData: SkillDataSourceData = {
  descriptionRqidLink: undefined,
  category: SkillCategoryEnum.Magic,
  skillName: "",
  specialization: "",
  baseChance: 0,
  gainedChance: 0,
  canGetExperience: true,
  hasExperience: false,
  runeRqidLinks: [],
};
