import type { UsageType } from "../../data-model/item-data/weaponData";
import type { RqgItem } from "../../items/rqgItem";

export type AttackDialogContext = {
  formData: AttackDialogFormData;

  weaponItem: RqgItem | undefined;
  skillItem: RqgItem | undefined;
  abilityChance: number;

  ammoQuantity: number;
  isOutOfAmmo: boolean;
  usageTypeOptions: SelectOptionData<UsageType>[];
  augmentOptions: SelectOptionData<number>[];
  defendingTokenName: string;
  attackingTokenOptions: SelectOptionData<string>[];
  attackingWeaponOptions: SelectOptionData<string>[];
  damageBonusSourceOptions: SelectOptionData<string>[];
  hitLocationFormulaOptions: SelectOptionData<string>[];
  aimedBlowOptions: SelectOptionData<number>[];
  totalChance: number;
};

export type AttackDialogFormData = {
  attackingTokenUuid: string;
  attackingWeaponUuid: string;
  usageType: UsageType;
  attackDamageBonus: string;
  attackExtraDamage: string;
  reduceAmmoQuantity: boolean;
  hitLocationFormula: string;
  aimedBlow: number;
  augmentModifier: string;
  proneTarget: boolean;
  unawareTarget: boolean;
  darkness: boolean;
  halved: boolean;
  otherModifierDescription: string;
  otherModifier: string;

  halvedModifier: number; // hidden field
};
