import { emptyActorDataRqg } from "./module/data-model/actor-data/actorDataRqg";
import { emptySkill } from "./module/data-model/item-data/skill";
import {
  passionType,
  skillType,
  meleeWeaponType,
} from "./module/data-model/item-data/itemTypes";
import { emptyPassion } from "./module/data-model/item-data/passion";
import { emptyMeleeWeapon } from "./module/data-model/item-data/weapon";

// Instantiated Actor types
export const Actors = {
  character: emptyActorDataRqg,
};

export const Items = {
  [skillType]: emptySkill,
  [passionType]: emptyPassion,
  [meleeWeaponType]: emptyMeleeWeapon,
  // [missileWeaponType]: emptyWeapon,
  // [gearType]: emptyGear; quantity ENC
  // [armourType]: emptyArmour; AP ENC "Hit location cover"
  // [spiritMagicType]: emptySpiritMagic;
  // [runeMagicType]: emptyRuneMagic;
  // [sorcerousMagicType]: emptysorcerousMagic;
};
