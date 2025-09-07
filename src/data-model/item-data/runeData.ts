import type { IAbility } from "../shared/ability";
import { ItemTypeEnum } from "./itemTypes";

import { RqidLink } from "../shared/rqidLink";
import type { RqgItem } from "@items/rqgItem.ts";

export type RuneItem = RqgItem & { system: RuneDataPropertiesData };

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Condition = "condition",
  Technique = "technique",
}

export type RuneType = {
  type: RuneTypeEnum;
  /** Translated name of the runeType */
  name: string;
};

export const defaultRuneType = {
  type: RuneTypeEnum.Form,
  name: RuneTypeEnum.Form,
};

export interface RuneDataSourceData extends IAbility {
  descriptionRqidLink: RqidLink | undefined;
  /** The name of the rune, Moon for example */
  rune: string;
  runeType: RuneType;
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
  runeType: defaultRuneType,
  opposingRuneRqidLink: undefined,
  minorRuneRqidLinks: [],
  isMastered: false,
};
