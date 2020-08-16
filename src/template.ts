import { emptyActorDataRqg } from "./module/data-model/actor-data/rqgActorData";
import { emptySkill } from "./module/data-model/item-data/skillData";
import { ItemTypeEnum } from "./module/data-model/item-data/itemTypes";
import { emptyPassion } from "./module/data-model/item-data/passionData";
import { emptyMeleeWeapon } from "./module/data-model/item-data/meleeWeaponData";

// Instantiated Actor types
export const Actors = {
  character: emptyActorDataRqg,
};

export const Items = {
  [ItemTypeEnum.Skill]: emptySkill,
  [ItemTypeEnum.Passion]: emptyPassion,
  [ItemTypeEnum.MeleeWeapon]: emptyMeleeWeapon,
  // [ItemTypeEnum.ElementalRunes]: emptyElementalRunes,
  // [ItemTypeEnum.PowerRunes]: emptyPowerRunes,
  // [ItemTypeEnum.MissileWeapon]: emptyMissileWeapon,
  // [ItemTypeEnum.Gear]: emptyGear; quantity ENC
  // [ItemTypeEnum.Armor]: emptyArmour; AP ENC "Hit location cover"
  // [ItemTypeEnum.SpiritMagic]: emptySpiritMagic;
  // [ItemTypeEnum.RuneMagic]: emptyRuneMagic;
  // [ItemTypeEnum.SorcerousMagic]: emptySorcerousMagic;
};
