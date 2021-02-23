import { Attributes, emptyAttributes } from "./attributes";
import { Characteristics, emptyCharacteristics } from "./characteristics";
import { Background, emptyBackground } from "./background";
import { emptySkillCategories, SkillCategories } from "./skillCategories";
import { RqgItem } from "../../items/rqgItem";
import { SkillData } from "../item-data/skillData";
import { LocationNode } from "../../items/shared/locationNode";

export class RqgActorData {
  constructor(
    public characteristics: Characteristics,
    public background: Background,
    public allies: string, // Editor text with links to allies and general notes
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
    public effects?: any, // TODO fooling around
    public locations?: Array<string>,
    public itemLocationTree?: LocationNode, // The tree structure for items containing each other
    public characterRunes?: Array<string>, // img links to elemental runes with positive chance
    public unloadedMissileSr?: Array<string>, // missileWeaponSRs if starting without loaded arrow
    public loadedMissileSr?: Array<string>, // missileWeaponSRs if starting with loaded arrow
    public showUiSection?: {
      health?: boolean;
      combat?: boolean;
      runes?: boolean;
      spiritMagic?: boolean;
      runeMagic?: boolean;
      sorcery?: boolean;
      skills?: boolean;
      gear?: boolean;
      passions?: boolean;
      background?: boolean;
      activeEffects?: boolean;
    }
  ) {}
}

export const emptyActorDataRqg: RqgActorData = new RqgActorData(
  emptyCharacteristics,
  emptyBackground,
  "",
  emptyAttributes, // Needs to be persisted?
  emptySkillCategories // Needs to be persisted?
);
