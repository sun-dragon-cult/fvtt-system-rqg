import type { RollMode } from "../../chat/chatMessage.types";

export type SpiritMagicRollDialogContext = {
  formData: SpiritMagicRollDialogFormData;

  spellName: string | null;
  spellSignature: string;
  spellImg: string | null;
  isVariable: boolean;

  augmentOptions: SelectOptionData<number>[];
  meditateOptions: SelectOptionData<number>[];
  totalChance: number;
  speakerName: string;
  rollMode: RollMode; // read in onSubmit by checking the active class
};

export type SpiritMagicRollDialogFormData = {
  levelUsed: number;
  boost: number;
  augmentModifier: number;
  meditateModifier: number;
  otherModifier: number;
  otherModifierDescription: string;

  spellItemUuid?: string; // hidden field
  powX5: number; // hidden field
};
