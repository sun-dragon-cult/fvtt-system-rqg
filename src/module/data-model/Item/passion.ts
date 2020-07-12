import {IAbility} from "../shared/ability";

export type PassionData = IAbility & {
  description: string;
};

export const emptyPassion: PassionData = {
  value: 0,
  description: "",
  experience: false,
};
