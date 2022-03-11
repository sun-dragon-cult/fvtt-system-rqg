import { IAbility } from "../shared/ability";
import { ItemTypeEnum } from "./itemTypes";

export enum PassionsEnum {
  Ambition = "Ambition",
  Cowardly = "Cowardly",
  Devotion = "Devotion",
  Fear = "Fear",
  Hate = "Hate",
  Honor = "Honor",
  Loyalty = "Loyalty",
  Love = "Love",
  Gluttony = "Gluttony",
  Vanity = "Vanity",
}

export interface PassionDataSourceData extends IAbility {
  passion: PassionsEnum;
  subject: string; // The subject of Fear etc
  description: string; // How did the character get this passion
  gmNotes: string;
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
  rqid: "",
  rqidpriority: 0,
  rqidlang: "",
  passion: PassionsEnum.Love,
  subject: "",
  description: "",
  gmNotes: "",
  chance: 0,
  canGetExperience: true,
  hasExperience: false,
};
