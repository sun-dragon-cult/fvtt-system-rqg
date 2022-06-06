import { defaultPriceData, IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

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
  "RQG.Item.Armor.ArmorMaterial.Leather",
  "RQG.Item.Armor.ArmorMaterial.HeavyLeather",
  "RQG.Item.Armor.ArmorMaterial.StuddedLeather",
  "RQG.Item.Armor.ArmorMaterial.BronzePlate",
  "RQG.Item.Armor.ArmorMaterial.BronzeDiscPlate",
  "RQG.Item.Armor.ArmorMaterial.BronzeSegmentedPlate",
  "RQG.Item.Armor.ArmorMaterial.LightScale",
  "RQG.Item.Armor.ArmorMaterial.HeavyScale",
  "RQG.Item.Armor.ArmorMaterial.Cuirboilli",
  "RQG.Item.Armor.ArmorMaterial.RingMail",
  "RQG.Item.Armor.ArmorMaterial.TurtleShell",
  "RQG.Item.Armor.ArmorMaterial.Quilted",
  "RQG.Item.Armor.ArmorMaterial.Linen",
];

export interface ArmorDataSourceData extends IPhysicalItem {
  /** Must match character size (TODO check not implemented yet) */
  size: number;
  /** Array of protected hitLocation names */
  hitLocations: string[];
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
  data: ArmorDataSourceData;
}

export interface ArmorDataProperties {
  type: ItemTypeEnum.Armor;
  data: ArmorDataPropertiesData;
}

export const defaultArmorData: ArmorDataSourceData = {
  description: "",
  gmNotes: "",
  size: 0,
  price: defaultPriceData,
  encumbrance: 1,
  equippedStatus: "carried",
  hitLocations: [],
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
