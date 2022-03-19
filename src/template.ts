import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { emptyCharacterData } from "./data-model/actor-data/rqgActorData";
import { emptySkill } from "./data-model/item-data/skillData";
import { emptyPassion } from "./data-model/item-data/passionData";
import { emptyRune } from "./data-model/item-data/runeData";
import { emptyGear } from "./data-model/item-data/gearData";
import { emptyArmor } from "./data-model/item-data/armorData";
import { emptySpiritMagic } from "./data-model/item-data/spiritMagicData";
import { emptyCult } from "./data-model/item-data/cultData";
import { emptyRuneMagic } from "./data-model/item-data/runeMagicData";
import { emptyHitLocation } from "./data-model/item-data/hitLocationData";
import { emptyWeapon } from "./data-model/item-data/weaponData";
import { emptyHomeland } from "./data-model/item-data/homelandData";

// Instantiated Actor types
export const Actors = {
  character: emptyCharacterData,
};

export const Items = {
  [ItemTypeEnum.Armor]: emptyArmor,
  [ItemTypeEnum.Cult]: emptyCult,
  [ItemTypeEnum.Gear]: emptyGear,
  [ItemTypeEnum.HitLocation]: emptyHitLocation,
  [ItemTypeEnum.Homeland]: emptyHomeland,
  [ItemTypeEnum.Passion]: emptyPassion,
  [ItemTypeEnum.Rune]: emptyRune,
  [ItemTypeEnum.RuneMagic]: emptyRuneMagic,
  [ItemTypeEnum.Skill]: emptySkill,
  // [ItemTypeEnum.ShamanicAbility]: emptyShamanicAbility,
  [ItemTypeEnum.SpiritMagic]: emptySpiritMagic,
  // [ItemTypeEnum.SorceryMagic]: emptySorceryMagic,
  [ItemTypeEnum.Weapon]: emptyWeapon,
};
