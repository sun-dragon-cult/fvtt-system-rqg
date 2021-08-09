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
import { ArmorItemData } from "./armorData";
import { SkillItemData } from "./skillData";
import { PassionItemData } from "./passionData";
import { RuneItemData } from "./runeData";
import { HitLocationItemData } from "./hitLocationData";
import { GearItemData } from "./gearData";
import { MeleeWeaponItemData } from "./meleeWeaponData";
import { MissileWeaponItemData } from "./missileWeaponData";
import { SpiritMagicItemData } from "./spiritMagicData";
import { CultItemData } from "./cultData";
import { RuneMagicItemData } from "./runeMagicData";

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
  [ItemTypeEnum.Skill, Skill],
  [ItemTypeEnum.Passion, Passion],
  [ItemTypeEnum.Rune, Rune],
  [ItemTypeEnum.HitLocation, HitLocation],
  [ItemTypeEnum.Gear, Gear],
  [ItemTypeEnum.Armor, Armor],
  [ItemTypeEnum.MeleeWeapon, MeleeWeapon],
  [ItemTypeEnum.MissileWeapon, MissileWeapon],
  [ItemTypeEnum.SpiritMagic, SpiritMagic],
  [ItemTypeEnum.Cult, Cult],
  [ItemTypeEnum.RuneMagic, RuneMagic],
]);

export type RqgItemData =
  | SkillItemData
  | PassionItemData
  | RuneItemData
  | HitLocationItemData
  | GearItemData
  | ArmorItemData
  | MeleeWeaponItemData
  | MissileWeaponItemData
  | SpiritMagicItemData
  | CultItemData
  | RuneMagicItemData;
