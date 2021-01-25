import { IAbility } from "../shared/ability";
import { JournalEntryLink } from "../shared/journalentrylink";

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Condition = "condition",
  Technique = "technique",
}

export type RuneData = IAbility &
  JournalEntryLink & {
    rune: string; // The name of the rune Fire for example
    runeType: RuneTypeEnum;
    chance: number;
    experience: boolean;
    opposingRune: string; // For Power Runes (+ Form: Man & Beast) ex: "Beast (form)"
    minorRunes: Array<string>; // For Sorcery - Elemental Runes & Techniques ex ["Air (elemental)", "Fire (elemental)"]
    isMastered: boolean; // For Sorcery
    // --- Derived / Convenience Data Below ---
    allRunes?: Array<string>; // For selecting which in sheet
    runeTypes?: Array<RuneTypeEnum>; // For selecting which in sheet
  };

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
