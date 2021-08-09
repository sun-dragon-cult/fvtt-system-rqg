import { IAbility } from "../shared/ability";
import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Condition = "condition",
  Technique = "technique",
}

export interface RuneData extends IAbility, JournalEntryLink {
  /** The name of the rune Fire for example */
  rune: string;
  runeType: RuneTypeEnum;
  chance: number;
  experience: boolean;
  /** For Power Runes (+ Form: Man & Beast) ex: "Beast (form)" */
  opposingRune: string;
  /** For Sorcery - Elemental Runes & Techniques ex ["Air (elemental)", "Fire (elemental)"] */
  minorRunes: string[];
  /** For Sorcery */
  isMastered: boolean;
}

export interface RuneItemData extends Item.Data<RuneData> {
  type: ItemTypeEnum.Rune;
}
export const emptyRune: RuneData = {
  rune: "",
  chance: 0,
  canGetExperience: true,
  experience: false,
  runeType: RuneTypeEnum.Form,
  opposingRune: "",
  minorRunes: [],
  isMastered: false,
  journalId: "",
  journalPack: "",
};
