import { Skill } from "../../items/skill-item/skill";
import { BaseItem } from "../../items/baseItem";
import { HitLocation } from "../../items/hit-location-item/hitLocation";
import { Gear } from "../../items/gear-item/gear";
import { Armor } from "../../items/armor-item/armor";

export enum ItemTypeEnum {
  Skill = "skill",
  Passion = "passion",
  ElementalRune = "elementalRune",
  PowerRune = "powerRune",
  HitLocation = "hitLocation",
  Gear = "gear",
  Armor = "armor",
  MeleeWeapon = "meleeWeapon",
  MissileWeapon = "missileWeapon",
  Shield = "shield",
  NaturalWeapon = "naturalWeapon",
  SpiritMagic = "spiritMagic",
  RuneMagic = "runeMagic",
  SorcerousMagic = "sorcerousMagic",
}

export const Item2TypeClass: Map<string, typeof BaseItem> = new Map([
  [ItemTypeEnum.Skill, Skill],
  [ItemTypeEnum.Passion, BaseItem],
  [ItemTypeEnum.ElementalRune, BaseItem],
  [ItemTypeEnum.PowerRune, BaseItem],
  [ItemTypeEnum.HitLocation, HitLocation],
  [ItemTypeEnum.Gear, Gear],
  [ItemTypeEnum.Armor, Armor],
]);
