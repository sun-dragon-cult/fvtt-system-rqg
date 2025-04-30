import type { RqgItem } from "../../items/rqgItem";

export type RuneMagicRollDialogContext = {
  formData: RuneMagicRollDialogFormData;

  spell: RqgItem | undefined;
  usedRune: RqgItem | undefined;

  eligibleRuneOptions: SelectOptionData<string>[];
  augmentOptions: SelectOptionData<number>[];
  meditateOptions: SelectOptionData<number>[];
  ritualOptions: SelectOptionData<number>[];
  totalChance: number;
  speakerName: string;
};

export type RuneMagicRollDialogFormData = {
  levelUsed: number;
  usedRuneId: string; // id of embedded rune
  boost: number;
  augmentModifier: number;
  meditateModifier: number;
  otherModifier: number;
  otherModifierDescription: string;

  spellItemUuid?: string; // hidden field
};
