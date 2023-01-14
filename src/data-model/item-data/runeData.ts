import { IAbility } from "../shared/ability";
import { ItemTypeEnum } from "./itemTypes";

import { RqidLink } from "../shared/rqidLink";

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Condition = "condition",
  Technique = "technique",
}

export interface RuneDataSourceData extends IAbility {
  descriptionRqidLink: RqidLink | undefined;
  /** The name of the rune, Moon for example */
  rune: string;
  runeType: RuneTypeEnum;
  chance: number;
  /** For Power Runes (+ Form: Man & Beast) ex: "Beast (form)" */
  opposingRune: string;
  /** For Sorcery - Elemental Runes & Techniques ex ["Air (elemental)", "Fire (elemental)"] */
  minorRunes: string[];
  /** For Sorcery */
  isMastered: boolean;
}

// --- Derived Data ---
export interface RuneDataPropertiesData extends RuneDataSourceData {}

export interface RuneDataSource {
  type: ItemTypeEnum.Rune;
  system: RuneDataSourceData;
}

export interface RuneDataProperties {
  type: ItemTypeEnum.Rune;
  system: RuneDataPropertiesData;
}

export const defaultRuneData: RuneDataSourceData = {
  descriptionRqidLink: undefined,
  rune: "",
  chance: 0,
  canGetExperience: true,
  hasExperience: false,
  runeType: RuneTypeEnum.Form,
  opposingRune: "",
  minorRunes: [],
  isMastered: false,
};
