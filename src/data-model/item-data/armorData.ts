import { emptyPrice, EquippedStatus, IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

export interface ArmorData extends IPhysicalItem {
  /** Must match character size */
  size: number;
  /** Array of protected hitLocation names */
  hitLocations: string[];
  material: string;
  absorbs: number;
  moveQuietlyPenalty: number;
  // --- Derived / Convenience Data Below ---
  /** Index of the hitlocations compendium */
  allHitLocations?: any[];
  /** For sheet dropdown */
  equippedStatuses?: EquippedStatus[];
}

export interface ArmorItemData extends Item.Data<ArmorData> {
  type: ItemTypeEnum.Armor;
}

export const emptyArmor: ArmorData = {
  description: "",
  gmNotes: "",
  size: 0,
  price: emptyPrice,
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
