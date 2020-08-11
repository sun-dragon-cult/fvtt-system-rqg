import { emptyActorDataRqg } from "./module/data-model/actor-data/rqgActorData";
import { emptySkill } from "./module/data-model/item-data/skill";
import { ItemTypeEnum } from "./module/data-model/item-data/itemTypes";
import { emptyPassion } from "./module/data-model/item-data/passion";
import { emptyMeleeWeapon } from "./module/data-model/item-data/weapon";

// Instantiated Actor types
export const Actors = {
  character: emptyActorDataRqg,
};

export const Items = {
  [ItemTypeEnum.Skill]: emptySkill,
  [ItemTypeEnum.Passion]: emptyPassion,
  [ItemTypeEnum.MeleeWeapon]: emptyMeleeWeapon,
  // [missileWeaponType]: emptyWeapon,
  // [gearType]: emptyGear; quantity ENC
  // [armourType]: emptyArmour; AP ENC "Hit location cover"
  // [spiritMagicType]: emptySpiritMagic;
  // [runeMagicType]: emptyRuneMagic;
  // [sorcerousMagicType]: emptysorcerousMagic;
};
