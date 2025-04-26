import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";
import type { UsageType } from "../../data-model/item-data/weaponData";
import type { RqgItem } from "../../items/rqgItem";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  type?: ItemTypeEnum;
  img: string | null;
  system: { chance: number };
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
};

// context in app v2
export type AttackDialogHandlebarsData = {
  weaponItem: RqgItem | undefined;
  skillItem: RqgItem | undefined;
  abilityChance: number;

  formData: AttackDialogObjectData;
  ammoQuantity: number;
  isOutOfAmmo: boolean;
  usageTypeOptions: Record<string, string>;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  defendingTokenName: string;
  attackingTokenOptions: Record<string, string>;
  attackingWeaponOptions: Record<string, string>;
  damageBonusSourceOptions: SelectOptionData<string>[];
  hitLocationFormulaOptions: Record<string, string>;
  aimedBlowOptions: SelectOptionData<number>[];
  totalChance: number;
};

// name:d form components data
export type AttackDialogObjectData = {
  attackingTokenUuid: string | undefined;
  attackingWeaponUuid: string | undefined;
  usageType: UsageType;
  /** In the dialog, it should be in the format `id:db` where the part before the colon is there to keep the select options unique */
  attackDamageBonus: string | undefined;
  attackExtraDamage: string;
  reduceAmmoQuantity: boolean;
  hitLocationFormula: string;
  aimedBlow: number;
  augmentModifier: string;
  proneTarget: boolean;
  unawareTarget: boolean;
  darkness: boolean;
  halved: boolean;
  halvedModifier: number; // now a hidden field
  otherModifierDescription: string;
  otherModifier: string;
};
