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
