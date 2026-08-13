import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

export type SpiritMagicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: SpiritMagicRollDialogFormData;

    speakerName: string;
    isVariable: boolean;

    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
    magicPointSourceOptions: SelectOptionData<string>[];
  };

export type SpiritMagicRollDialogFormData = {
  levelUsed: number;
  boost: number;
  magicPointSource: string;
  augmentModifier: number;
  meditateModifier: number;
  otherModifier: number;
  otherModifierDescription: string;

  spellItemUuid?: string; // hidden field
  tokenUuid?: string; // hidden field
  powX5: number; // hidden field
};
