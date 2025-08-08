import type { RqgItem } from "../../items/rqgItem";
import type { RollHeaderData } from "../app-parts/rollHeader.types";
import type { RollFooterData } from "../app-parts/rollFooter.types";

export type RuneMagicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: RuneMagicRollDialogFormData;

    speakerName: string;

    usedRune: RqgItem | undefined;
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
