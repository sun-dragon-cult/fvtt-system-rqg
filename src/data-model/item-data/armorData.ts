import { IPhysicalItem } from "./IPhysicalItem";

export type ArmorData = IPhysicalItem & {
  description: string;
  encumbrance: number;
  hitLocations: Array<number>;
  material: string;
  absorbs: number;
  moveQuietlyPenalty: number;
  // --- Derived / Convenience Data Below ---
  hitLocationsCSV?: string; // Only for easier editing of hit locations in armorSheet
};

export const emptyArmor: ArmorData = {
  description: "",
  encumbrance: 1,
  equipped: false,
  hitLocations: [1],
  material: "",
  absorbs: 0,
  moveQuietlyPenalty: 0,
};
