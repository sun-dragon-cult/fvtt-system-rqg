import { IAbility } from "../shared/ability";

export enum RuneEnum {
  // Elemental
  Fire = "fire",
  Darkness = "darkness",
  Water = "water",
  Earth = "earth",
  Air = "air",
  Moon = "moon",
  // Power
  Fertility = "fertility",
  Death = "death",

  Harmony = "harmony",
  Disorder = "disorder",

  Truth = "truth",
  Illusion = "illusion",

  Stasis = "stasis",
  Movement = "movement",
  // Form
  Man = "man",
  Beast = "beast",

  Spirit = "spirit",
  Plant = "plant",
  Chaos = "chaos",

  // Sorcery Techniques
  Command = "command",
  Tap = "tap",

  Combine = "combine",
  Separate = "separate",

  Dispel = "dispel",
  Summon = "summon",

  // Conditions
  Magic = "magic",
  Mastery = "mastery",
  Infinity = "infinity",
  Luck = "luck",
  Fate = "fate",
}

export enum RuneTypeEnum {
  Element = "element",
  Power = "power",
  Form = "form",
  Technique = "technique",
}

export type RuneData = IAbility & {
  chance?: number;
  experience?: boolean;
  description: string;
  runeType: RuneTypeEnum;
  opposingRune?: RuneEnum; // For Power Runes (+ Form: Man & Beast)
  minorRunes: Array<RuneEnum>; // For Sorcery - Elemental Runes & Techniques
  isMastered: boolean; // For Sorcery
  // --- Derived / Convenience Data Below ---
  runes?: Array<RuneEnum>; // For selecting which in sheet
  runeTypes?: Array<RuneTypeEnum>; // For selecting which in sheet
};

export const emptyRune: RuneData = {
  chance: 0,
  experience: false,
  description: "",
  runeType: RuneTypeEnum.Form,
  minorRunes: [],
  isMastered: false,
};
