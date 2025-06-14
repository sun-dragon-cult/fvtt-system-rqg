import type { UsageType } from "../../data-model/item-data/weaponData";

export type DefenceType = "parry" | "dodge" | "ignore";

export type DefenceDialogContext = {
  formData: DefenceDialogFormData;

  defenceName: string | null;
  defenceButtonText: string;

  defenceChance: number;
  attackerName: string;
  defenderOptions: SelectOptionData<string>[];
  defenceOptions: SelectOptionData<string>[];
  parryingWeaponOptions: SelectOptionData<string>[];
  parryingWeaponUsageOptions: SelectOptionData<string>[];
  augmentOptions: SelectOptionData<number>[];
  subsequentDefenceOptions: SelectOptionData<number>[];
  totalChance: number;
};

export type DefenceDialogFormData = {
  defendingTokenOrActorUuid: string;
  defence: DefenceType | undefined;
  parryingWeaponUuid: string | undefined;
  parryingWeaponUsage: UsageType | undefined;
  augmentModifier: string;
  subsequentDefenceModifier: string;
  halved: boolean;
  otherModifier: string;
  otherModifierDescription: string;
  masterOpponentModifier: number;

  halvedModifier: number; // hidden field
  attackChatMessageUuid: string | undefined; // hidden field
};
