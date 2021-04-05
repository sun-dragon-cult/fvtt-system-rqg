import { IAbility } from "../shared/ability";
import { ItemTypeEnum } from "./itemTypes";

export enum PassionsEnum {
  Devotion = "devotion",
  Fear = "fear",
  Hate = "hate",
  Honor = "honor",
  Loyalty = "loyalty",
  Love = "love",
}

export interface PassionData extends IAbility {
  passion: PassionsEnum;
  subject: string; // The subject of Fear etc
  description: string; // How did the character get this passion
  // --- Derived / Convenience Data Below ---
  passionTypes?: PassionsEnum[];
}

export interface PassionItemData extends Item.Data<PassionData> {
  type: ItemTypeEnum.Passion;
}

export const emptyPassion: PassionData = {
  passion: PassionsEnum.Love,
  subject: "",
  description: "",
  chance: 0,
  canGetExperience: true,
  hasExperience: false,
};
