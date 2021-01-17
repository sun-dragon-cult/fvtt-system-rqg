import { Attributes, emptyAttributes } from "./attributes";
import { Characteristics, emptyCharacteristics } from "./characteristics";
import { RaceEnum } from "./race";
import { Background, emptyBackground } from "./background";
import { emptySkillCategories, SkillCategories } from "./skillCategories";
import { RqgItem } from "../../items/rqgItem";
import { SkillData } from "../item-data/skillData";

export class RqgActorData {
  constructor(
    public characteristics: Characteristics,
    public background: Background,
    public race: RaceEnum,
    // --- Derived / Convenience Data Below ---
    public attributes: Attributes, // Most are derived
    public skillCategoryModifiers?: SkillCategories,
    public occupations?: any, // For occupation dropdown
    public homelands?: any, // For homeland dropdown
    public ownedItems?: any, // All owned items divided into type
    public dodgeSkill?: RqgItem<SkillData>, // For access on combat part of sheet
    public spiritCombatSkill?: RqgItem<SkillData>, // For access on spirit combat part of sheet
    public powCrystals?: any[], // Stores label & value of AE affecting magicPoints.max
    public spiritMagicPointSum?: number, // Total spirit magic points learnt
    public freeInt?: number, // For sorcery
    public isGM?: boolean,
    public effects?: any // TODO fooling around
  ) {}
}

export const emptyActorDataRqg: RqgActorData = new RqgActorData(
  emptyCharacteristics,
  emptyBackground,
  RaceEnum.Humanoid,
  emptyAttributes, // Needs to be persisted?
  emptySkillCategories // Needs to be persisted?
);
