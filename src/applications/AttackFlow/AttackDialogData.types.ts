import type { UsageType } from "../../data-model/item-data/weaponData";
import type { combatRollHeaderPartData } from "./combatRollHeader.types";
import { AttackFooterData } from "./attackFooter.types";

export type AttackDialogContext = combatRollHeaderPartData &
  AttackFooterData & {
    formData: AttackDialogFormData;

    ammoQuantity: number;
    isOutOfAmmo: boolean;
    usageTypeOptions: SelectOptionData<UsageType>[];
    augmentOptions: SelectOptionData<number>[];
    defendingTokenName: string;
    attackerOptions: SelectOptionData<string>[];
    attackingWeaponOptions: SelectOptionData<string>[];
    damageBonusSourceOptions: SelectOptionData<string>[];
    hitLocationFormulaOptions: SelectOptionData<string>[];
    aimedBlowOptions: SelectOptionData<number>[];
  };

export type AttackDialogFormData = {
  attackingTokenOrActorUuid: string;
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
