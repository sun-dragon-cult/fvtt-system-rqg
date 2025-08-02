import { defaultPriceData, type IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

export interface GearDataSourceData extends IPhysicalItem {}

// --- Derived Data ---
export interface GearDataPropertiesData extends GearDataSourceData {}

export interface GearDataSource {
  type: ItemTypeEnum.Gear;
  system: GearDataSourceData;
}

export interface GearDataProperties {
  type: ItemTypeEnum.Gear;
  system: GearDataPropertiesData;
}

export const defaultGearData: GearDataSourceData = {
  description: "",
  gmNotes: "",
  quantity: 1,
  price: defaultPriceData,
  encumbrance: 1,
  equippedStatus: "carried",
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};
