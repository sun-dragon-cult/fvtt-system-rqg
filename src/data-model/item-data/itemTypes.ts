import { Skill } from "../../actors/item-specific/skill";
import { AbstractEmbeddedItem } from "../../actors/item-specific/abstractEmbeddedItem";
import { HitLocation } from "../../actors/item-specific/hitLocation";
import { Gear } from "../../actors/item-specific/gear";
import { Armor } from "../../actors/item-specific/armor";
import { MeleeWeapon } from "../../actors/item-specific/meleeWeapon";
import { MissileWeapon } from "../../actors/item-specific/missileWeapon";
import { SpiritMagic } from "../../actors/item-specific/spiritMagic";
import { Cult } from "../../actors/item-specific/cult";
import { RuneMagic } from "../../actors/item-specific/runeMagic";
import { Passion } from "../../actors/item-specific/passion";
import { Rune } from "../../actors/item-specific/rune";
import { ArmorDataProperties, ArmorDataSource } from "./armorData";
import { PassionDataProperties, PassionDataSource } from "./passionData";
import { HitLocationDataProperties, HitLocationDataSource } from "./hitLocationData";
import { GearDataProperties, GearDataSource } from "./gearData";
import { MeleeWeaponDataProperties, MeleeWeaponDataSource } from "./meleeWeaponData";
import { MissileWeaponDataProperties, MissileWeaponDataSource } from "./missileWeaponData";
import { SpiritMagicDataProperties, SpiritMagicDataSource } from "./spiritMagicData";
import { CultDataProperties, CultDataSource } from "./cultData";
import { RuneMagicDataProperties, RuneMagicDataSource } from "./runeMagicData";
import { SkillDataProperties, SkillDataSource } from "./skillData";
import { RuneDataProperties, RuneDataSource } from "./runeData";

export enum ItemTypeEnum {
  Skill = "skill",
  Passion = "passion",
  Rune = "rune",
  HitLocation = "hitLocation",
  Gear = "gear",
  Armor = "armor",
  MeleeWeapon = "meleeWeapon",
  MissileWeapon = "missileWeapon",
  SpiritMagic = "spiritMagic",
  Cult = "cult",
  RuneMagic = "runeMagic",
  ShamanicAbility = "shamanicAbility",
}

/**
 * Map from ItemTypeEnum to responsible AbstractEmbeddedItem class.
 */
export const ResponsibleItemClass: Map<string, typeof AbstractEmbeddedItem> = new Map([
  [ItemTypeEnum.Armor, Armor],
  [ItemTypeEnum.Cult, Cult],
  [ItemTypeEnum.Gear, Gear],
  [ItemTypeEnum.HitLocation, HitLocation],
  [ItemTypeEnum.MeleeWeapon, MeleeWeapon],
  [ItemTypeEnum.MissileWeapon, MissileWeapon],
  [ItemTypeEnum.Passion, Passion],
  [ItemTypeEnum.Rune, Rune],
  [ItemTypeEnum.RuneMagic, RuneMagic],
  [ItemTypeEnum.Skill, Skill],
  [ItemTypeEnum.SpiritMagic, SpiritMagic],
]);

export type RqgItemDataSource =
  | ArmorDataSource
  | CultDataSource
  | GearDataSource
  | HitLocationDataSource
  | MeleeWeaponDataSource
  | MissileWeaponDataSource
  | PassionDataSource
  | RuneDataSource
  | RuneMagicDataSource
  | SkillDataSource
  | SpiritMagicDataSource;

export type RqgItemDataProperties =
  | ArmorDataProperties
  | CultDataProperties
  | GearDataProperties
  | HitLocationDataProperties
  | MeleeWeaponDataProperties
  | MissileWeaponDataProperties
  | PassionDataProperties
  | RuneDataProperties
  | RuneMagicDataProperties
  | SkillDataProperties
  | SpiritMagicDataProperties;
