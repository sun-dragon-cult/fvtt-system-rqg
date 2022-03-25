import { Skill } from "../../actors/item-specific/skill";
import { AbstractEmbeddedItem } from "../../actors/item-specific/abstractEmbeddedItem";
import { HitLocation } from "../../actors/item-specific/hitLocation";
import { Gear } from "../../actors/item-specific/gear";
import { Armor } from "../../actors/item-specific/armor";
import { SpiritMagic } from "../../actors/item-specific/spiritMagic";
import { Cult } from "../../actors/item-specific/cult";
import { RuneMagic } from "../../actors/item-specific/runeMagic";
import { Passion } from "../../actors/item-specific/passion";
import { Rune } from "../../actors/item-specific/rune";
import { ArmorDataProperties, ArmorDataSource } from "./armorData";
import { PassionDataProperties, PassionDataSource } from "./passionData";
import { HitLocationDataProperties, HitLocationDataSource } from "./hitLocationData";
import { GearDataProperties, GearDataSource } from "./gearData";
import { SpiritMagicDataProperties, SpiritMagicDataSource } from "./spiritMagicData";
import { CultDataProperties, CultDataSource } from "./cultData";
import { RuneMagicDataProperties, RuneMagicDataSource } from "./runeMagicData";
import { SkillDataProperties, SkillDataSource } from "./skillData";
import { RuneDataProperties, RuneDataSource } from "./runeData";
import { WeaponDataProperties, WeaponDataSource } from "./weaponData";
import { Weapon } from "../../actors/item-specific/weapon";
import { HomelandDataProperties as HomelandDataProperties, HomelandDataSource } from "./homelandData";
import {
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
