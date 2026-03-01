import type { UsageType } from "@item-model/weaponData.ts";
import type { CombatRollHeaderPartData } from "./combatRollHeader.types.ts";
import type { DefenceFooterData } from "./defenceFooterData.types.ts";

export type DefenceType = "parry" | "dodge" | "ignore";

export type DefenceDialogContext = CombatRollHeaderPartData &
  DefenceFooterData & {
    formData: DefenceDialogFormData;

    attackerName: string;
    defenderOptions: SelectOptionData<string>[];
    defenceOptions: SelectOptionData<string>[];
    parryingWeaponOptions: SelectOptionData<string>[];
    parryingWeaponUsageOptions: SelectOptionData<string>[];
    augmentOptions: SelectOptionData<number>[];
    subsequentDefenceOptions: SelectOptionData<number>[];
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
  defenceMasterOpponentModifier: number;
  attackMasterOpponentModifier: number;

  halvedModifier: number; // hidden field
  attackChatMessageUuid: string | undefined; // hidden field
};
