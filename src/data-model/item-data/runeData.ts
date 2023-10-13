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
  /** Translated name of the runeType */
  runeType: string;
  chance: number;
  /** For Power Runes */
  opposingRuneRqidLink: RqidLink | undefined;
  /** For Sorcery - Elemental Runes & Techniques */
  minorRuneRqidLinks: RqidLink[];
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
  opposingRuneRqidLink: undefined,
  minorRuneRqidLinks: [],
  isMastered: false,
};
