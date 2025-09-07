import { Attributes } from "./attributes";
import { type Characteristics } from "./characteristics";
import { type Background } from "./background";
import { SkillCategories } from "./skillCategories";

export enum ActorTypeEnum {
  Character = "character",
}

import type { RqgActor } from "@actors/rqgActor.ts";

export type CharacterActor = RqgActor & { system: CharacterDataPropertiesData };

export interface CharacterDataSourceData {
  characteristics: Characteristics;
  background: Background;
  allies: string; // Editor text with links to allies and general notes
  editMode: boolean;
  extendedName: string;
  // --- Derived / Convenience Data Below ---
  attributes: Attributes; // Most are derived // TODO Split / move data?
}

// --- Derived Data ---
export interface CharacterDataPropertiesData extends CharacterDataSourceData {
  skillCategoryModifiers: SkillCategories;
}

export interface CharacterDataSource {
  type: "character";
  system: CharacterDataSourceData;
}

export interface CharacterDataProperties {
  type: "character";
  system: CharacterDataPropertiesData;
}

export type RqgActorDataSource = CharacterDataSource;

export type RqgActorDataProperties = CharacterDataProperties;

// export const defaultCharacterData: CharacterDataSourceData = {
//   characteristics: defaultCharacteristics,
//   background: defaultBackground,
//   allies: "",
//   extendedName: "",
//   attributes: defaultAttributes, // Needs to be persisted?
//   editMode: true,
// };
