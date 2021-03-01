import { EquippedStatus, IPhysicalItem } from "./IPhysicalItem";

export type ArmorData = IPhysicalItem & {
  size: number; // Must match character size
  hitLocations: Array<string>; // Array of hitLocation names
  material: string;
  absorbs: number;
  moveQuietlyPenalty: number;
  // --- Derived / Convenience Data Below ---
  allHitLocations?: Array<any>; // Index of the hitlocations compendium
  equippedStatuses?: Array<EquippedStatus>; // For sheet dropdown
};

export const emptyArmor: ArmorData = {
  description: "",
  size: 0,
  price: 0,
  encumbrance: 1,
  equippedStatus: "carried",
  hitLocations: [],
  material: "",
  absorbs: 0,
  moveQuietlyPenalty: 0,
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};
