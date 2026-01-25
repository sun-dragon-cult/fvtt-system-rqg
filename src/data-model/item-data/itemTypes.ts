import type { ArmorDataProperties, ArmorDataSource, ArmorItem } from "./armorData";
import type { PassionDataProperties, PassionDataSource, PassionItem } from "./passionData";
import type { HitLocationDataProperties, HitLocationDataSource } from "./hitLocationData";
import type { GearDataProperties, GearDataSource, GearItem } from "./gearData";
import type { SpiritMagicDataProperties, SpiritMagicDataSource } from "./spiritMagicData";
import type { CultDataProperties, CultDataSource } from "./cultData";
import type { RuneMagicDataProperties, RuneMagicDataSource } from "./runeMagicData";
import type { SkillDataProperties, SkillDataSource, SkillItem } from "./skillData";
import type { RuneDataProperties, RuneDataSource, RuneItem } from "./runeData";
import type { WeaponDataProperties, WeaponDataSource, WeaponItem } from "./weaponData";
import type {
  HomelandDataProperties as HomelandDataProperties,
  HomelandDataSource,
} from "./homelandData";
import type {
  OccupationDataProperties as OccupationDataProperties,
  OccupationDataSource,
} from "./occupationData";
import type { AbstractEmbeddedItem } from "@items/abstractEmbeddedItem.ts";

import { Armor } from "@items/armor-item/armor.ts";
import { Cult } from "@items/cult-item/cult.ts";
import { Gear } from "@items/gear-item/gear.ts";
import { HitLocation } from "@items/hit-location-item/hitLocation.ts";
import { Passion } from "@items/passion-item/passion.ts";
import { Rune } from "@items/rune-item/rune.ts";
import { RuneMagic } from "@items/rune-magic-item/runeMagic.ts";
import { Skill } from "@items/skill-item/skill.ts";
import { SpiritMagic } from "@items/spirit-magic-item/spiritMagic.ts";
import { Weapon } from "@items/weapon-item/weapon.ts";

// TODO en experiment with removing enums
// const itemTypes = [
//   "armor",
//   "cult",
//   "gear",
//   "hitLocation",
//   "homeland",
//   "occupation",
//   "passion",
//   "rune",
//   "runeMagic",
//   "skill",
//   "spiritMagic",
//   "weapon",
//   // "shamanicAbility", future expansion
//   // "sorceryMagic",    future expansion
// ] as const;
//
// export type ItemType = (typeof itemTypes)[number];
// export { itemTypes };
//
// export function assertDocumentType<T extends { type: ItemType | "type" | "base" | "system"} }>(
//   obj: { type: ItemType },
//   itemType: T["type"],
// ): asserts obj is T {
//   if (obj.type !== itemType) {
//     throw new Error(`Expected type ${itemType}, got ${obj.type}`);
//   }
// }

// Base item types with literal string values (for type extraction)
const ItemTypeBase = {
  Armor: "armor",
  Cult: "cult",
  Gear: "gear",
  HitLocation: "hitLocation",
  Homeland: "homeland",
  Occupation: "occupation",
  Passion: "passion",
  Rune: "rune",
  RuneMagic: "runeMagic",
  Skill: "skill",
  SpiritMagic: "spiritMagic",
  Weapon: "weapon",
  // ShamanicAbility: "shamanicAbility",
  // SorceryMagic: "sorceryMagic",
} as const;

// Export union type of RQG item types (without Foundry internal types)
export type RqgItemType = (typeof ItemTypeBase)[keyof typeof ItemTypeBase];

// Helper to cast object values to Item.SubType
function asItemSubTypes<T extends Record<string, string>>(
  obj: T,
): { [K in keyof T]: Item.SubType } {
  return obj as any;
}

// ItemTypeEnum with values cast to Item.SubType for Foundry compatibility
export const ItemTypeEnum = asItemSubTypes(ItemTypeBase);
export type ItemTypeEnum = (typeof ItemTypeEnum)[keyof typeof ItemTypeEnum];

/**
 * Map from ItemTypeEnum to responsible AbstractEmbeddedItem class.
 */
export const ResponsibleItemClass: Map<string, typeof AbstractEmbeddedItem> = new Map([
  [ItemTypeEnum.Armor, Armor],
  [ItemTypeEnum.Cult, Cult],
  [ItemTypeEnum.Gear, Gear],
  [ItemTypeEnum.HitLocation, HitLocation],
  [ItemTypeEnum.Passion, Passion],
  [ItemTypeEnum.Rune, Rune],
  [ItemTypeEnum.RuneMagic, RuneMagic],
  [ItemTypeEnum.Skill, Skill],
  [ItemTypeEnum.SpiritMagic, SpiritMagic],
  [ItemTypeEnum.Weapon, Weapon],
]);

export type RqgItemDataSource =
  | ArmorDataSource
  | CultDataSource
  | GearDataSource
  | HitLocationDataSource
  | HomelandDataSource
  | OccupationDataSource
  | PassionDataSource
  | RuneDataSource
  | RuneMagicDataSource
  | SkillDataSource
  | SpiritMagicDataSource
  | WeaponDataSource;

export type RqgItemDataProperties =
  | ArmorDataProperties
  | CultDataProperties
  | GearDataProperties
  | HitLocationDataProperties
  | HomelandDataProperties
  | OccupationDataProperties
  | PassionDataProperties
  | RuneDataProperties
  | RuneMagicDataProperties
  | SkillDataProperties
  | SpiritMagicDataProperties
  | WeaponDataProperties;

export type PhysicalItem = GearItem | WeaponItem | ArmorItem;

export type AbilityItem = PassionItem | RuneItem | SkillItem;
export const abilityItemTypes = ["skill", "rune", "passion"] as const;
