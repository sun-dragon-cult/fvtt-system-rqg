/**
 * Pure enum/const definitions for armor-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const armorTypePrefix = "RQG.Item.Armor.ArmorType.";

/** The keys of the known armor types, stored in `system.armorType` instead of their labels. */
export const armorTypeKeys = [
  "Hood",
  "BroadBrimmedHat",
  "Cap",
  "CompositeHelm",
  "OpenHelm",
  "ClosedHelm",
  "FullHelm",
  "Sleeves",
  "Vambraces",
  "Cuirass",
  "Linothorax",
  "Segmented",
  "Hauberk",
  "Skirt",
  "PantsTrews",
  "Greaves",
] as const;

export const materialPrefix = "RQG.Item.Armor.ArmorMaterial.";

/** The keys of the known armor materials, stored in `system.material` instead of their labels. */
export const materialKeys = [
  "SoftLeather",
  "Leather",
  "HeavyLeather",
  "StuddedLeather",
  "Cuirboilli",
  "Linen",
  "Quilted",
  "BronzeRingMail",
  "TurtleShell",
  "LightBronzeScale",
  "HeavyBronzeScale",
  "SegmentedBronzePlate",
  "BronzeDiskPlate",
  "BronzePlate",
  "IronPlate",
] as const;
