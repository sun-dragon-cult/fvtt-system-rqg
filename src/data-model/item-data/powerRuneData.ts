import { IAbility } from "../shared/ability";

export enum PowerRuneEnum {
  Man = "man",
  Beast = "beast",
  Fertility = "fertility",
  Death = "death",
  Harmony = "harmony",
  Disorder = "disorder",
  Truth = "truth",
  Illusion = "illusion",
  Stasis = "stasis",
  Movement = "movement",
}

export type PowerRuneData = IAbility & {
  description: string;
  opposingRune: PowerRuneEnum;
  // --- Derived / Convenience Data Below ---
  powerRuneTypes?: PowerRuneEnum[];
};

export const emptyPowerRune: PowerRuneData = {
  description: "",
  opposingRune: PowerRuneEnum.Beast,
  chance: 50,
  experience: false,
};
