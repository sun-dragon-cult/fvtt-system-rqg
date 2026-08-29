import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

export type RespondToResistanceRequestDialogContext = RollHeaderData &
  RollFooterData & {
    formData: RespondToResistanceRequestDialogFormData;
    speakerName: string;
    activeLabel: string;
    passiveLabel: string;
    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
  };

export type RespondToResistanceRequestDialogFormData = {
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;

  chatMessageUuid: string; // hidden field
};
