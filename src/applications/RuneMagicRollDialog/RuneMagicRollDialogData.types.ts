import type { RollHeaderData } from "../app-parts/rollHeader.types.ts";
import type { RollFooterData } from "../app-parts/rollFooter.types.ts";

/** Minimal rune data needed for the roll rune dialog to avoid complex type recursion */
export type PartialRuneItem = {
  id: string | null;
  name: string | null;
  img: string | null;
  system: {
    chance: number;
    hasExperience?: boolean;
  };
};

export type RuneMagicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: RuneMagicRollDialogFormData;

    speakerName: string;

    usedRune: PartialRuneItem | undefined;
    eligibleRuneOptions: SelectOptionData<string>[];
    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
    ritualOptions: SelectOptionData<number>[];
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
