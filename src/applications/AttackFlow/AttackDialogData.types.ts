import type { UsageType } from "@item-model/weaponData.ts";
import type { CombatRollHeaderPartData } from "./combatRollHeader.types.ts";
import type { AttackFooterData } from "./attackFooter.types.ts";

export type AttackDialogContext = CombatRollHeaderPartData &
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
