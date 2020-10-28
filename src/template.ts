import { emptyActorDataRqg } from "./data-model/actor-data/rqgActorData";
import { emptySkill } from "./data-model/item-data/skillData";
import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { emptyPassion } from "./data-model/item-data/passionData";
import { emptyElementalRune } from "./data-model/item-data/elementalRuneData";
import { emptyPowerRune } from "./data-model/item-data/powerRuneData";
import { emptyHitLocation } from "./data-model/item-data/hitLocationData";
import { emptyGear } from "./data-model/item-data/gearData";
import { emptyArmor } from "./data-model/item-data/armorData";
import { emptyMeleeWeapon } from "./data-model/item-data/meleeWeaponData";
import { emptyMissileWeapon } from "./data-model/item-data/missileWeaponData";
import { emptySpiritMagic } from "./data-model/item-data/spiritMagicData";

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
  [ItemTypeEnum.Gear]: emptyGear,
  [ItemTypeEnum.Armor]: emptyArmor,
  [ItemTypeEnum.MeleeWeapon]: emptyMeleeWeapon,
  [ItemTypeEnum.MissileWeapon]: emptyMissileWeapon,
  [ItemTypeEnum.SpiritMagic]: emptySpiritMagic,
  // [ItemTypeEnum.Cult]: emptyCult;
  // [ItemTypeEnum.RuneMagic]: emptyRuneMagic;
  // [ItemTypeEnum.SorcerousMagic]: emptySorcerousMagic;
};
