import { type IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";
import type { RqgItem } from "@items/rqgItem.ts";

export type GearItem = RqgItem & { system: GearDataPropertiesData };

export interface GearDataSourceData extends IPhysicalItem {}

// --- Derived Data ---
export interface GearDataPropertiesData extends GearDataSourceData {}

export interface GearDataSource {
  type: typeof ItemTypeEnum.Gear;
  system: GearDataSourceData;
}

export interface GearDataProperties {
  type: typeof ItemTypeEnum.Gear;
  system: GearDataPropertiesData;
}

// export const defaultGearData: GearDataSourceData = {
//   description: "",
//   gmNotes: "",
//   quantity: 1,
//   price: defaultPriceData,
//   encumbrance: 1,
//   equippedStatus: "carried",
//   location: "",
//   isContainer: false,
//   attunedTo: "",
//   physicalItemType: "unique",
// };
