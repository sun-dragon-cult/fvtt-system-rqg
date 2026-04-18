import type { ArmorItem } from "./armorDataModel";
import type { PassionItem } from "./passionDataModel";
import type { GearItem } from "./gearDataModel";
import type { SkillItem } from "./skillDataModel";
import type { RuneItem } from "./runeDataModel";
import type { WeaponItem } from "./weaponDataModel";
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

export type PhysicalItem = GearItem | WeaponItem | ArmorItem;

export type AbilityItem = PassionItem | RuneItem | SkillItem;
export const abilityItemTypes = ["skill", "rune", "passion"] as const;
