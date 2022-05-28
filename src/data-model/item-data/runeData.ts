import { IAbility } from "../shared/ability";
import { RqidLink } from "../shared/rqidLink";
import { DEFAULT_RQIDLANG, DEFAULT_RQIDPRIORITY, IRqid } from "./IRqid";
import { ItemTypeEnum } from "./itemTypes";

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Condition = "condition",
  Technique = "technique",
}

export interface RuneDataSourceData extends IAbility, IRqid {
  /** The name of the rune Fire for example */
  descriptionRqidLink: RqidLink;
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
  data: RuneDataSourceData;
}

export interface RuneDataProperties {
  type: ItemTypeEnum.Rune;
  data: RuneDataPropertiesData;
}

export const emptyRune: RuneDataSourceData = {
  rqid: "",
  rqidPriority: DEFAULT_RQIDPRIORITY,
  rqidLang: DEFAULT_RQIDLANG,
  descriptionRqidLink: new RqidLink(),
  rune: "",
  chance: 0,
  canGetExperience: true,
  hasExperience: false,
  runeType: RuneTypeEnum.Form,
  opposingRune: "",
  minorRunes: [],
  isMastered: false,
};
