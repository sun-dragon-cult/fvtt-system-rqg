import {emptyActorDataRqg} from "./module/data-model/Actor/actor-data-rqg";
import {emptySkill} from "./module/data-model/Item/skill";
import {passionType, skillType, weaponType} from "./module/data-model/Item/item-types";
import {emptyPassion} from "./module/data-model/Item/passion";
import {emptyWeapon} from "./module/data-model/Item/weapon";

// Instantiated Actor types
export const Actors = {
  character: emptyActorDataRqg
};

export const Items = {
  [skillType]: emptySkill,
  [passionType]: emptyPassion,
  [weaponType]: emptyWeapon

  // [item]: emptyItem;
  // [armour]: emptyArmour;
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
