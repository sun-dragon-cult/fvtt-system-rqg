import { Skill } from "../../items/skill-item/skill";
import { BaseItem } from "../../items/baseItem";
import { HitLocation } from "../../items/hit-location-item/hitLocation";
import { Gear } from "../../items/gear-item/gear";
import { Armor } from "../../items/armor-item/armor";
import { MeleeWeapon } from "../../items/melee-weapon-item/meleeWeapon";
import { MissileWeapon } from "../../items/missile-weapon-item/missileWeapon";
import { SpiritMagic } from "../../items/spirit-magic-item/spiritMagic";
import { Cult } from "../../items/cult-item/cult";
import { RuneMagic } from "../../items/rune-magic-item/runeMagic";

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
  SorcerousMagic = "sorcerousMagic",
  ShamanicAbility = "shamanicAbility",
}

/**
 * Map from ItemTypeEnum to responsible BaseItem class.
 */
export const ResponsibleItemClass: Map<string, typeof BaseItem> = new Map([
  [ItemTypeEnum.Skill, Skill],
  [ItemTypeEnum.Passion, BaseItem],
  [ItemTypeEnum.Rune, BaseItem],
  [ItemTypeEnum.HitLocation, HitLocation],
  [ItemTypeEnum.Gear, Gear],
  [ItemTypeEnum.Armor, Armor],
  [ItemTypeEnum.MeleeWeapon, MeleeWeapon],
  [ItemTypeEnum.MissileWeapon, MissileWeapon],
  [ItemTypeEnum.SpiritMagic, SpiritMagic],
  [ItemTypeEnum.Cult, Cult],
  [ItemTypeEnum.RuneMagic, RuneMagic],
]);
