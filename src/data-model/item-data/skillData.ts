import { IAbility } from "../shared/ability";
import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";

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

export interface SkillDataSourceData extends IAbility, JournalEntryLink {
  category: SkillCategoryEnum;
  skillName: string;
  specialization: string;
  baseChance: number;
  learnedChance: number;
  /** For Sorcery Magic */
  runes: string[];
}

// --- Derived Data ---
export interface SkillDataPropertiesData extends SkillDataSourceData {
  /** Derived: Learned chance + categoryMod (from IAbility) */
  chance: number;
  /** Derived: The modifier from skill category for this skill*/
  categoryMod: number;
}

export interface SkillDataSource {
  type: ItemTypeEnum.Skill;
  data: SkillDataSourceData;
}

export interface SkillDataProperties {
  type: ItemTypeEnum.Skill;
  data: SkillDataPropertiesData;
}

export const emptySkill: SkillDataSourceData = {
  rqid: "",
  rqidpriority: 0,
  rqidlocale: "",
  category: SkillCategoryEnum.Magic,
  skillName: "",
  specialization: "",
  baseChance: 0,
  learnedChance: 0,
  canGetExperience: true,
  hasExperience: false,
  runes: [],
  journalId: "",
  journalPack: "",
};
