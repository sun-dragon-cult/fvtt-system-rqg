import { Skill } from "../../items/skill-item/skill";
import { AbstractEmbeddedItem } from "../../items/abstractEmbeddedItem";
import { HitLocation } from "../../items/hit-location-item/hitLocation";
import { Gear } from "../../items/gear-item/gear";
import { Armor } from "../../items/armor-item/armor";
import { SpiritMagic } from "../../items/spirit-magic-item/spiritMagic";
import { Cult } from "../../items/cult-item/cult";
import { RuneMagic } from "../../items/rune-magic-item/runeMagic";
import { Passion } from "../../items/passion-item/passion";
import { Rune } from "../../items/rune-item/rune";
import type { ArmorDataProperties, ArmorDataSource } from "./armorData";
import type { PassionDataProperties, PassionDataSource } from "./passionData";
import type { HitLocationDataProperties, HitLocationDataSource } from "./hitLocationData";
import type { GearDataProperties, GearDataSource } from "./gearData";
import type { SpiritMagicDataProperties, SpiritMagicDataSource } from "./spiritMagicData";
import type { CultDataProperties, CultDataSource } from "./cultData";
import type { RuneMagicDataProperties, RuneMagicDataSource } from "./runeMagicData";
import type { SkillDataProperties, SkillDataSource } from "./skillData";
import type { RuneDataProperties, RuneDataSource } from "./runeData";
import type { WeaponDataProperties, WeaponDataSource } from "./weaponData";
import { Weapon } from "../../items/weapon-item/weapon";
import type {
  HomelandDataProperties as HomelandDataProperties,
  HomelandDataSource,
} from "./homelandData";
import type {
  OccupationDataProperties as OccupationDataProperties,
  OccupationDataSource,
} from "./occupationData";

export enum ItemTypeEnum {
  Armor = "armor",
  Cult = "cult",
  Gear = "gear",
  HitLocation = "hitLocation",
  Homeland = "homeland",
  Occupation = "occupation",
  Passion = "passion",
  Rune = "rune",
  RuneMagic = "runeMagic",
  Skill = "skill",
  SpiritMagic = "spiritMagic",
  Weapon = "weapon",
  ShamanicAbility = "shamanicAbility",
  SorceryMagic = "sorceryMagic",
}

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
