import { IPhysicalItem } from "./IPhysicalItem";
import { emptyTracked, Tracked } from "../shared/tracked";

export type MeleeWeaponData = IPhysicalItem & {
  description: string;
  damage: Tracked;
  strikeRank: Tracked;
  hitPoints: Tracked;
  quantity: number;
  encumbrance: number;
};

export const emptyMeleeWeapon: MeleeWeaponData = {
  damage: emptyTracked,
  description: "",
  strikeRank: emptyTracked,
  hitPoints: emptyTracked,
  quantity: 1,
  encumbrance: 1,
  equipped: false,
  // TODO "Required skill" (to calculate % and total SR)
};
