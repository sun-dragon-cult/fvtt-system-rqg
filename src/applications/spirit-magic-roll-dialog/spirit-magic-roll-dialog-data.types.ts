import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

export type SpiritMagicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: SpiritMagicRollDialogFormData;

    speakerName: string;
    /** Comma-joined names of the current targets, or "" when nothing is targeted. */
    targetName: string;
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
  // Set only when spellItem is unembedded (e.g. a transient Matrix Spell resolution, #959) -
  // spellItemUuid alone can't round-trip through fromUuid for those. Same "unpersisted item
  // survives as JSON" idiom as reputationItemJson in ability-roll-dialog-data.types.ts.
  spellItemJson?: string; // hidden field
  tokenUuid?: string; // hidden field
  casterActorUuid?: string; // hidden field
  powX5: number; // hidden field
};
