import type { RollHeaderData } from "../app-parts/rollHeader.types.ts";
import type { RollFooterData } from "../app-parts/rollFooter.types.ts";
import type { RuneItem } from "@item-model/runeData.ts";

export type RuneMagicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: RuneMagicRollDialogFormData;

    speakerName: string;

    usedRune: RuneItem | undefined;
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
