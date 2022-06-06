import { defaultPriceData, IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

export interface GearDataSourceData extends IPhysicalItem {}

// --- Derived Data ---
export interface GearDataPropertiesData extends GearDataSourceData {}

export interface GearDataSource {
  type: ItemTypeEnum.Gear;
  data: GearDataSourceData;
}

export interface GearDataProperties {
  type: ItemTypeEnum.Gear;
  data: GearDataPropertiesData;
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
