import { IPhysicalItem } from "./IPhysicalItem";
import { emptyResource, Resource } from "../shared/resource";

export type MeleeWeaponData = IPhysicalItem & {
  description: string;
  damage: Resource;
  strikeRank: Resource;
  hitPoints: Resource;
  quantity: number;
  encumbrance: number;
};

export const emptyMeleeWeapon: MeleeWeaponData = {
  damage: emptyResource,
  description: "",
  strikeRank: emptyResource,
  hitPoints: emptyResource,
  quantity: 1,
  encumbrance: 1,
  equipped: false,
  // TODO "Required skill" (to calculate % and total SR)
};
