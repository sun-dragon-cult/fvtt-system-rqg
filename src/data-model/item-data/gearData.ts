import { emptyPrice, IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

export interface GearData extends IPhysicalItem {}

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
