import { IAbility } from "../shared/ability";

// export enum RuneEnum {
//   // Elemental
//   Fire = "fire",
//   Darkness = "darkness",
//   Water = "water",
//   Earth = "earth",
//   Air = "air",
//   Moon = "moon",
//   // Power
//   Fertility = "fertility",
//   Death = "death",
//
//   Harmony = "harmony",
//   Disorder = "disorder",
//
//   Truth = "truth",
//   Illusion = "illusion",
//
//   Stasis = "stasis",
//   Movement = "movement",
//   // Form
//   Man = "man",
//   Beast = "beast",
//
//   Spirit = "spirit",
//   Plant = "plant",
//   Chaos = "chaos",
//
//   // Sorcery Techniques
//   Command = "command",
//   Tap = "tap",
//
//   Combine = "combine",
//   Separate = "separate",
//
//   Dispel = "dispel",
//   Summon = "summon",
//
//   // Conditions
//   Magic = "magic",
//   Mastery = "mastery",
//   Infinity = "infinity",
//   Luck = "luck",
//   Fate = "fate",
// }

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Condition = "condition",
  Technique = "technique",
}

export type RuneData = IAbility & {
  rune: string; // The name of the rune Fire for example
  runeType: RuneTypeEnum;
  description: string; // TODO should be a link to a journal entry
  chance?: number;
  experience?: boolean;
  opposingRune?: string; // For Power Runes (+ Form: Man & Beast) ex: "Beast (form)"
  minorRunes?: Array<string>; // For Sorcery - Elemental Runes & Techniques ex ["Air (elemental)", "Fire (elemental)"]
  isMastered?: boolean; // For Sorcery
  // --- Derived / Convenience Data Below ---
  runes?: Array<string>; // For selecting which in sheet
  runeTypes?: Array<RuneTypeEnum>; // For selecting which in sheet
};

export const emptyRune: RuneData = {
  rune: "",
  chance: 0,
  experience: false,
  description: "",
  runeType: RuneTypeEnum.Form,
  minorRunes: [],
  isMastered: false,
};
