import { IPhysicalItem } from "./IPhysicalItem";

// TODO Armor shouldn't have quantity (part of IPhysicalItem)

export type ArmorData = IPhysicalItem & {
  description: string;
  size: number; // Must match character size
  // race: RaceEnum; // Must match character race TODO necessary?
  encumbrance: number;
  hitLocations: Array<string>; // Array of hitLocation names
  material: string;
  absorbs: number;
  moveQuietlyPenalty: number;
  // --- Derived / Convenience Data Below ---
  hitLocationsCSV?: string; // Only for easier editing of hit locations in armorSheet
};

export const emptyArmor: ArmorData = {
  description: "",
  size: 0,
  price: 0,
  encumbrance: 1,
  isEquipped: false,
  hitLocations: ["head"],
  material: "",
  absorbs: 0,
  moveQuietlyPenalty: 0,
};
