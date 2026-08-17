import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

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
    isStackable: boolean;
    isOneUse: boolean;

    usedRune: PartialRuneItem | undefined;
    eligibleRuneOptions: SelectOptionData<string>[];
    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
    ritualOptions: SelectOptionData<number>[];
    magicPointSourceOptions: SelectOptionData<string>[];
    showMagicPointSource: boolean;
    runePointSourceOptions: SelectOptionData<string>[];
    showRunePointSource: boolean;
    showRunePointSourceMismatchWarning: boolean;
  };

export type RuneMagicRollDialogFormData = {
  levelUsed: number;
  usedRuneId: string; // id of embedded rune
  boost: number;
  magicPointSource: string;
  runePointSource: string;
  augmentModifier: number;
  meditateModifier: number;
  otherModifier: number;
  otherModifierDescription: string;

  spellItemUuid?: string; // hidden field
  tokenUuid?: string; // hidden field
  casterActorUuid?: string; // hidden field
};
