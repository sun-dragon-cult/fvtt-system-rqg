import type { UsageType } from "../../data-model/item-data/weaponData";
import type { DefenceType } from "../../chat/RqgChatMessage.types";

export type DefenceDialogContext = {
  formData: DefenceDialogFormData;

  defenceName: string | null;
  defenceButtonText: string;

  defenceChance: number;
  attackingTokenName: string;
  defendingTokenOptions: SelectOptionData<string>[];
  defenceOptions: SelectOptionData<string>[];
  parryingWeaponOptions: SelectOptionData<string>[];
  parryingWeaponUsageOptions: SelectOptionData<string>[];
  augmentOptions: SelectOptionData<number>[];
  subsequentDefenceOptions: SelectOptionData<number>[];
  totalChance: number;
};

export type DefenceDialogFormData = {
  defendingTokenUuid: string;
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
