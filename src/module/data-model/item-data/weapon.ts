import { IPhysicalItem } from "./IPhysicalItem";
import { emptyTracked, Tracked } from "../shared/tracked";

export type WeaponData = IPhysicalItem & {
  description: string;
  damage: string;
  hitPoints: Tracked;
  strikeRank: number;
};

export const emptyWeapon: WeaponData = {
  description: "",
  damage: "",
  strikeRank: 0,
  quantity: 1,
  encumbrance: 1,
  hitPoints: emptyTracked,
  // TODO Required skill (to calculate % and total SR)
};
