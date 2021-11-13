import { emptyPrice, IPhysicalItem } from "./IPhysicalItem";
import { ItemTypeEnum } from "./itemTypes";

export const armorTypeTranslationKeys = [
  "RQG.ArmorType.Hood",
  "RQG.ArmorType.BroadBrimmedHat",
  "RQG.ArmorType.Cap",
  "RQG.ArmorType.CompositeHelm",
  "RQG.ArmorType.OpenHelm",
  "RQG.ArmorType.ClosedHelm",
  "RQG.ArmorType.FullHelm",
  "RQG.ArmorType.Sleeves",
  "RQG.ArmorType.Vambraces",
  "RQG.ArmorType.Cuirass",
  "RQG.ArmorType.Linothorax",
  "RQG.ArmorType.Hauberk",
  "RQG.ArmorType.Skirt",
  "RQG.ArmorType.PantsTrews",
  "RQG.ArmorType.Greaves",
];

export const materialTranslationKeys = [
  "RQG.ArmorMaterial.Leather",
  "RQG.ArmorMaterial.HeavyLeather",
  "RQG.ArmorMaterial.StuddedLeather",
  "RQG.ArmorMaterial.BronzePlate",
  "RQG.ArmorMaterial.BronzeDiscPlate",
  "RQG.ArmorMaterial.BronzeSegmentedPlate",
  "RQG.ArmorMaterial.LightScale",
  "RQG.ArmorMaterial.HeavyScale",
  "RQG.ArmorMaterial.Cuirboilli",
  "RQG.ArmorMaterial.RingMail",
  "RQG.ArmorMaterial.TurtleShell",
  "RQG.ArmorMaterial.Quilted",
  "RQG.ArmorMaterial.Linen",
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

export const emptyArmor: ArmorDataSourceData = {
  description: "",
  gmNotes: "",
  size: 0,
  price: emptyPrice,
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
