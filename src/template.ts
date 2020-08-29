import { emptyActorDataRqg } from "./data-model/actor-data/rqgActorData";
import { emptySkill } from "./data-model/item-data/skillData";
import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { emptyPassion } from "./data-model/item-data/passionData";
import { emptyElementalRune } from "./data-model/item-data/elementalRuneData";
import { emptyPowerRune } from "./data-model/item-data/powerRuneData";
import { emptyHitLocation } from "./data-model/item-data/hitLocationData";

// Instantiated Actor types
export const Actors = {
  character: emptyActorDataRqg,
};

export const Items = {
  [ItemTypeEnum.Skill]: emptySkill,
  [ItemTypeEnum.Passion]: emptyPassion,
  [ItemTypeEnum.ElementalRune]: emptyElementalRune,
  [ItemTypeEnum.PowerRune]: emptyPowerRune,
  [ItemTypeEnum.HitLocation]: emptyHitLocation,
  // [ItemTypeEnum.MeleeWeapon]: emptyMeleeWeapon,
  // [ItemTypeEnum.MissileWeapon]: emptyMissileWeapon,
  // [ItemTypeEnum.Gear]: emptyGear; quantity ENC
  // [ItemTypeEnum.Armor]: emptyArmour; AP ENC "Hit location cover"
  // [ItemTypeEnum.SpiritMagic]: emptySpiritMagic;
  // [ItemTypeEnum.RuneMagic]: emptyRuneMagic;
  // [ItemTypeEnum.SorcerousMagic]: emptySorcerousMagic;
};
