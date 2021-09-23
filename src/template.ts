import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { emptyCharacterData } from "./data-model/actor-data/rqgActorData";
import { emptySkill } from "./data-model/item-data/skillData";
import { emptyPassion } from "./data-model/item-data/passionData";
import { emptyRune } from "./data-model/item-data/runeData";
import { emptyGear } from "./data-model/item-data/gearData";
import { emptyArmor } from "./data-model/item-data/armorData";
import { emptyMeleeWeapon } from "./data-model/item-data/meleeWeaponData";
import { emptyMissileWeapon } from "./data-model/item-data/missileWeaponData";
import { emptySpiritMagic } from "./data-model/item-data/spiritMagicData";
import { emptyCult } from "./data-model/item-data/cultData";
import { emptyRuneMagic } from "./data-model/item-data/runeMagicData";
import { emptyHitLocation } from "./data-model/item-data/hitLocationData";
import { emptyWeapon } from "./data-model/item-data/weaponData";

// Instantiated Actor types
export const Actors = {
  character: emptyCharacterData,
};

export const Items = {
  [ItemTypeEnum.Skill]: emptySkill,
  [ItemTypeEnum.Passion]: emptyPassion,
  [ItemTypeEnum.Rune]: emptyRune,
  [ItemTypeEnum.HitLocation]: emptyHitLocation,
  [ItemTypeEnum.Gear]: emptyGear,
  [ItemTypeEnum.Armor]: emptyArmor,
  [ItemTypeEnum.MeleeWeapon]: emptyMeleeWeapon,
  [ItemTypeEnum.MissileWeapon]: emptyMissileWeapon,
  [ItemTypeEnum.Weapon]: emptyWeapon,
  [ItemTypeEnum.SpiritMagic]: emptySpiritMagic,
  [ItemTypeEnum.Cult]: emptyCult,
  [ItemTypeEnum.RuneMagic]: emptyRuneMagic,
  // [ItemTypeEnum.ShamanicAbility]: emptyShamanicAbility,
};
