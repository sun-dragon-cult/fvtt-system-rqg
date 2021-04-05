import { Attributes, emptyAttributes } from "./attributes";
import { Characteristics, emptyCharacteristics } from "./characteristics";
import { Background, emptyBackground } from "./background";
import { emptySkillCategories, SkillCategories } from "./skillCategories";
import { RqgItemData } from "../item-data/itemTypes";

export interface RqgCharacterData {
  characteristics: Characteristics;
  background: Background;
  allies: string; // Editor text with links to allies and general notes
  // --- Derived / Convenience Data Below ---
  attributes: Attributes; // Most are derived
  skillCategoryModifiers?: SkillCategories;
}

interface CharacterActorData extends Actor.Data<RqgCharacterData, RqgItemData> {
  type: "character";
}

// Can be expanded with more actor types in addition to character
export type RqgActorData = CharacterActorData;

export const emptyCharacterData: RqgCharacterData = {
  characteristics: emptyCharacteristics,
  background: emptyBackground,
  allies: "",
  attributes: emptyAttributes, // Needs to be persisted?
  skillCategoryModifiers: emptySkillCategories, // Needs to be persisted?
};
