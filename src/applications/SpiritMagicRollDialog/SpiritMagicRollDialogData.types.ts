import type { RollHeaderData } from "../app-parts/rollHeader.types.ts";
import type { RollFooterData } from "../app-parts/rollFooter.types.ts";

export type SpiritMagicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: SpiritMagicRollDialogFormData;

    speakerName: string;
    isVariable: boolean;

    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
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
