import type { ArmorItem } from "./armorDataModel";
import type { PassionItem } from "./passionDataModel";
import type { GearItem } from "./gearDataModel";
import type { SkillItem } from "./skillDataModel";
import type { RuneItem } from "./runeDataModel";
import type { WeaponItem } from "./weaponDataModel";

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

export type PhysicalItem = GearItem | WeaponItem | ArmorItem;

export type AbilityItem = PassionItem | RuneItem | SkillItem;
export const abilityItemTypes = ["skill", "rune", "passion"] as const;
