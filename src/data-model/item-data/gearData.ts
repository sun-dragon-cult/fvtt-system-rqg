import { emptyPrice, IPhysicalItem } from "./IPhysicalItem";
import { DEFAULT_RQIDLANG, DEFAULT_RQIDPRIORITY } from "./IRqid";
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

export const emptyGear: GearDataSourceData = {
  rqid: "",
  rqidPriority: DEFAULT_RQIDPRIORITY,
  rqidLang: DEFAULT_RQIDLANG,
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
