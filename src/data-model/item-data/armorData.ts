import { defaultPriceData, type IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";
import type { RqgItem } from "@items/rqgItem.ts";

export type ArmorItem = RqgItem & { system: ArmorDataPropertiesData };

export const armorTypeTranslationKeys = [
  "RQG.Item.Armor.ArmorType.Hood",
  "RQG.Item.Armor.ArmorType.BroadBrimmedHat",
  "RQG.Item.Armor.ArmorType.Cap",
  "RQG.Item.Armor.ArmorType.CompositeHelm",
  "RQG.Item.Armor.ArmorType.OpenHelm",
  "RQG.Item.Armor.ArmorType.ClosedHelm",
  "RQG.Item.Armor.ArmorType.FullHelm",
  "RQG.Item.Armor.ArmorType.Sleeves",
  "RQG.Item.Armor.ArmorType.Vambraces",
  "RQG.Item.Armor.ArmorType.Cuirass",
  "RQG.Item.Armor.ArmorType.Linothorax",
  "RQG.Item.Armor.ArmorType.Hauberk",
  "RQG.Item.Armor.ArmorType.Skirt",
  "RQG.Item.Armor.ArmorType.PantsTrews",
  "RQG.Item.Armor.ArmorType.Greaves",
];

export const materialTranslationKeys = [
  "RQG.Item.Armor.ArmorMaterial.SoftLeather",
  "RQG.Item.Armor.ArmorMaterial.Leather",
  "RQG.Item.Armor.ArmorMaterial.HeavyLeather",
  "RQG.Item.Armor.ArmorMaterial.StuddedLeather",
  "RQG.Item.Armor.ArmorMaterial.Cuirboilli",
  "RQG.Item.Armor.ArmorMaterial.Linen",
  "RQG.Item.Armor.ArmorMaterial.Quilted",
  "RQG.Item.Armor.ArmorMaterial.BronzeRingMail",
  "RQG.Item.Armor.ArmorMaterial.TurtleShell",
  "RQG.Item.Armor.ArmorMaterial.LightBronzeScale",
  "RQG.Item.Armor.ArmorMaterial.HeavyBronzeScale",
  "RQG.Item.Armor.ArmorMaterial.SegmentedBronzePlate",
  "RQG.Item.Armor.ArmorMaterial.BronzeDiskPlate",
  "RQG.Item.Armor.ArmorMaterial.BronzePlate",
  "RQG.Item.Armor.ArmorMaterial.IronPlate",
];

export interface ArmorDataSourceData extends IPhysicalItem {
  /** Must match character size (TODO check not implemented yet) */
  size: number;
  /** Links to the hit location rqids the armor covers */
  hitLocationRqidLinks: RqidLink[];
  namePrefix: string;
  armorType: string;
  material: string;
  absorbs: number;
  moveQuietlyPenalty: number;
}

// --- Derived Data ---
export interface ArmorDataPropertiesData extends ArmorDataSourceData {}

export interface ArmorDataSource {
  type: ItemTypeEnum.Armor;
  system: ArmorDataSourceData;
}

export interface ArmorDataProperties {
  type: ItemTypeEnum.Armor;
  system: ArmorDataPropertiesData;
}

export const defaultArmorData: ArmorDataSourceData = {
  description: "",
  gmNotes: "",
  size: 0,
  price: defaultPriceData,
  encumbrance: 1,
  equippedStatus: "carried",
  hitLocationRqidLinks: [],
  namePrefix: "",
  armorType: "",
  material: "",
  absorbs: 0,
  moveQuietlyPenalty: 0,
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
  quantity: 1,
};
