import { Skill } from "../../items/skill-item/skill";
import { BaseEmbeddedItem } from "../../items/baseEmbeddedItem";
import { HitLocation } from "../../items/hit-location-item/hitLocation";
import { Gear } from "../../items/gear-item/gear";
import { Armor } from "../../items/armor-item/armor";
import { MeleeWeapon } from "../../items/melee-weapon-item/meleeWeapon";
import { MissileWeapon } from "../../items/missile-weapon-item/missileWeapon";
import { SpiritMagic } from "../../items/spirit-magic-item/spiritMagic";
import { Cult } from "../../items/cult-item/cult";
import { RuneMagic } from "../../items/rune-magic-item/runeMagic";
import { Passion } from "../../items/passion-item/passion";
import { Rune } from "../../items/rune-item/rune";
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
 * Map from ItemTypeEnum to responsible BaseEmbeddedItem class.
 */
export const ResponsibleItemClass: Map<string, typeof BaseEmbeddedItem> = new Map([
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
