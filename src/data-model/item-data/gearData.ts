import { emptyPrice, EquippedStatus, IPhysicalItem, PhysicalItemType } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

export interface GearData extends IPhysicalItem {
  // --- Derived / Convenience Data Below ---
  /** For sheet dropdown */
  equippedStatuses?: EquippedStatus[];
  /** For sheet dropdown */
  physicalItemTypes?: PhysicalItemType[];
}

export interface GearItemData extends Item.Data<GearData> {
  type: ItemTypeEnum.Gear;
}

export const emptyGear: GearData = {
  description: "",
  gmNotes: "",
  quantity: 1,
  price: emptyPrice,
  encumbrance: 1,
  equippedStatus: "carried",
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};
