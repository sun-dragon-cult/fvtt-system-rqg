import { IAbility } from "../shared/ability";
import { ItemTypeEnum } from "./itemTypes";

export enum PassionsEnum {
  Cowardly = "cowardly",
  Devotion = "devotion",
  Fear = "fear",
  Hate = "hate",
  Honor = "honor",
  Loyalty = "loyalty",
  Love = "love",
}

export interface PassionDataSourceData extends IAbility {
  passion: PassionsEnum;
  subject: string; // The subject of Fear etc
  description: string; // How did the character get this passion
}

// --- Derived Data ---
export interface PassionDataPropertiesData extends PassionDataSourceData {}

export interface PassionDataSource {
  type: ItemTypeEnum.Passion;
  data: PassionDataSourceData;
}

export interface PassionDataProperties {
  type: ItemTypeEnum.Passion;
  data: PassionDataPropertiesData;
}

export const emptyPassion: PassionDataSourceData = {
  passion: PassionsEnum.Love,
  subject: "",
  description: "",
  chance: 0,
  canGetExperience: true,
  hasExperience: false,
};
