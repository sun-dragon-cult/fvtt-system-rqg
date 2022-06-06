import { Attributes, defaultAttributes } from "./attributes";
import { Characteristics, defaultCharacteristics } from "./characteristics";
import { Background, defaultBackground } from "./background";
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

export const defaultCharacterData: CharacterDataSourceData = {
  characteristics: defaultCharacteristics,
  background: defaultBackground,
  allies: "",
  attributes: defaultAttributes, // Needs to be persisted?
};
