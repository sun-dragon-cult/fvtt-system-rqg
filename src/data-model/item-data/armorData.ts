import { emptyPrice, EquippedStatus, IPhysicalItem } from "./IPhysicalItem";
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

export interface ArmorData extends IPhysicalItem {
  /** Must match character size */
  size: number;
  /** Array of protected hitLocation names */
  hitLocations: string[];
  namePrefix: string;
  armorType: string;
  material: string;
  absorbs: number;
  moveQuietlyPenalty: number;
  // --- Derived / Convenience Data Below ---
  /** Index of the hitlocations compendium */
  allHitLocations?: any[];
  /** For sheet dropdown */
  equippedStatuses?: EquippedStatus[];
  armorTypeNames?: string[]; // Translated list of ArmorType list
  materialNames?: string[]; // Translated list of ArmorMaterial list
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
  namePrefix: "",
  armorType: "",
  material: "",
  absorbs: 0,
  moveQuietlyPenalty: 0,
  location: "",
  isContainer: false,
  attunedTo: "",
  physicalItemType: "unique",
};
