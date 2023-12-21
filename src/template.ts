import { ItemTypeEnum } from "./data-model/item-data/itemTypes";
import { defaultCharacterData } from "./data-model/actor-data/rqgActorData";
import { defaultSkillData } from "./data-model/item-data/skillData";
import { defaultPassionData } from "./data-model/item-data/passionData";
import { defaultRuneData } from "./data-model/item-data/runeData";
import { defaultGearData } from "./data-model/item-data/gearData";
import { defaultArmorData } from "./data-model/item-data/armorData";
import { defaultSpiritMagicData } from "./data-model/item-data/spiritMagicData";
import { defaultCultData } from "./data-model/item-data/cultData";
import { defaultRuneMagicData } from "./data-model/item-data/runeMagicData";
import { defaultHitLocationData } from "./data-model/item-data/hitLocationData";
import { defaultWeaponData } from "./data-model/item-data/weaponData";
import { defaultHomelandData } from "./data-model/item-data/homelandData";
import { defaultOccupationData } from "./data-model/item-data/occupationData";
import { defaultBackgroundData } from "./data-model/item-data/backgroundData";

// Instantiated Actor types
export const Actors = {
  character: defaultCharacterData,
};

export const Items = {
  [ItemTypeEnum.Armor]: defaultArmorData,
  [ItemTypeEnum.Background]: defaultBackgroundData,
  [ItemTypeEnum.Cult]: defaultCultData,
  [ItemTypeEnum.Gear]: defaultGearData,
  [ItemTypeEnum.HitLocation]: defaultHitLocationData,
  [ItemTypeEnum.Homeland]: defaultHomelandData,
  [ItemTypeEnum.Occupation]: defaultOccupationData,
  [ItemTypeEnum.Passion]: defaultPassionData,
  [ItemTypeEnum.Rune]: defaultRuneData,
  [ItemTypeEnum.RuneMagic]: defaultRuneMagicData,
  [ItemTypeEnum.Skill]: defaultSkillData,
  // [ItemTypeEnum.ShamanicAbility]: emptyShamanicAbility,
  [ItemTypeEnum.SpiritMagic]: defaultSpiritMagicData,
  // [ItemTypeEnum.SorceryMagic]: emptySorceryMagic,
  [ItemTypeEnum.Weapon]: defaultWeaponData,
};
