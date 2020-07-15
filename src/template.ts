import { emptyActorDataRqg } from "./module/data-model/actor-data/actor-data-rqg";
import { emptySkill } from "./module/data-model/item-data/skill";
import {
  passionType,
  skillType,
  weaponType,
} from "./module/data-model/item-data/item-types";
import { emptyPassion } from "./module/data-model/item-data/passion";
import { emptyWeapon } from "./module/data-model/item-data/weapon";

// Instantiated Actor types
export const Actors = {
  character: emptyActorDataRqg,
};

export const Items = {
  [skillType]: emptySkill,
  [passionType]: emptyPassion,
  [weaponType]: emptyWeapon,

  // [item]: emptyItem; quantity ENC
  // [armour]: emptyArmour; AP ENC "Hit location cover"
  // [spiritMagic]: emptySpiritMagic;
  // [runeMagic]: emptyRuneMagic;
  // [sorcerousMagic]: emptysorcerousMagic;

  // TODO Copied from blue-rose - modify for rqg!
  // [physicalItemType]: emptyPhysicalItem,
  // [weaponType]: emptyWeapon,
  // [shieldType]: emptyShield,
  // [armorType]: emptyArmor,
  // [focusType]: emptyFocus,
  // [arcanaType]: emptyArcana,
  // [talentType]: emptyTalent,
};
