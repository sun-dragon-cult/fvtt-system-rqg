import { Attributes, emptyAttributes } from "./attributes";
import { Characteristics, emptyCharacteristics } from "./characteristics";
import { Background, emptyBackground } from "./background";
import { SkillCategories } from "./skillCategories";

export enum ActorTypeEnum {
  Character = "character",
}

export interface CharacterDataSourceData {
  characteristics: Characteristics;
  background: Background;
  allies: string; // Editor text with links to allies and general notes
  // --- Derived / Convenience Data Below ---
  attributes: Attributes; // Most are derived // TODO Split / move data?
}

// --- Derived Data ---
export interface CharacterDataPropertiesData extends CharacterDataSourceData {
  skillCategoryModifiers: SkillCategories;
}

export interface CharacterDataSource {
  type: ActorTypeEnum.Character;
  data: CharacterDataSourceData;
}

export interface CharacterDataProperties {
  type: ActorTypeEnum.Character;
  data: CharacterDataPropertiesData;
}

export type RqgActorDataSource = CharacterDataSource;

export type RqgActorDataProperties = CharacterDataProperties;

export const emptyCharacterData: CharacterDataSourceData = {
  characteristics: emptyCharacteristics,
  background: emptyBackground,
  allies: "",
  attributes: emptyAttributes, // Needs to be persisted?
};
