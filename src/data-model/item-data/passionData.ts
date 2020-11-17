import { IAbility } from "../shared/ability";

export enum PassionsEnum {
  Devotion = "devotion",
  Fear = "fear",
  Hate = "hate",
  Honor = "honor",
  Loyalty = "loyalty",
  Love = "love",
}

export type PassionData = IAbility & {
  passion: PassionsEnum;
  subject: string; // The subject of Fear etc
  description: string; // How did the character get this passion
  // --- Derived / Convenience Data Below ---
  passionTypes?: PassionsEnum[];
};

export const emptyPassion: PassionData = {
  passion: PassionsEnum.Love,
  subject: "",
  description: "",
  chance: 0,
  experience: false,
};
