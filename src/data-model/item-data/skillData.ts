import { IAbility } from "../shared/ability";
import { JournalEntryLink } from "../shared/journalentrylink";

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

export type SkillData = IAbility &
  JournalEntryLink & {
    category: SkillCategoryEnum;
    skillName: string;
    specialization: string;
    baseChance: number;
    learnedChance: number;
    runes: Array<string>; // For Sorcery Magic
    // --- Derived / Convenience Data Below ---
    chance?: number;
    categoryMod?: number;
    skillCategories?: SkillCategoryEnum[];
    isGM?: boolean;
    allRunes?: Array<string>; // For sheet dropdown
  };

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
