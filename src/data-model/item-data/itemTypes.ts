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
import { Weapon } from "../../items/weapon-item/weapon";
import {
  HomelandDataProperties as HomelandDataProperties,
  HomelandDataSource,
} from "./homelandData";
import {
  OccupationDataProperties as OccupationDataProperties,
  OccupationDataSource,
} from "./occupationData";
import { Background } from "../../items/background-item/background";
import { BackgroundDataProperties, BackgroundDataSource } from "./backgroundData";

export enum ItemTypeEnum {
  Armor = "armor",
  Background = "background",
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
  [ItemTypeEnum.Background, Background],
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
  | BackgroundDataSource
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
  | BackgroundDataProperties
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
