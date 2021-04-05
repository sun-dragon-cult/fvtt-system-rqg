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

export interface SkillData extends IAbility, JournalEntryLink {
  category: SkillCategoryEnum;
  skillName: string;
  specialization: string;
  baseChance: number;
  learnedChance: number;
  /** For Sorcery Magic */
  runes: string[];
  // --- Derived / Convenience Data Below ---
  categoryMod?: number;
  skillCategories?: SkillCategoryEnum[];
  isGM?: boolean;
  /** For sheet dropdown */
  allRunes?: Compendium.IndexEntry[];
}

export interface SkillItemData extends Item.Data<SkillData> {
  type: ItemTypeEnum.Skill;
}

export const emptySkill: SkillData = {
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
