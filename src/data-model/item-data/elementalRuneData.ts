import { IAbility } from "../shared/ability";

export enum ElementalRuneEnum {
  Fire = "fire",
  Darkness = "darkness",
  Water = "water",
  Earth = "earth",
  Air = "air",
  Moon = "moon",
}

export type ElementalRuneData = IAbility & {
  description: string;
  // --- Derived / Convenience Data Below ---
  elementalRuneTypes?: ElementalRuneEnum[];
};

export const emptyElementalRune: ElementalRuneData = {
  description: "",
  chance: 0,
  experience: false,
};
