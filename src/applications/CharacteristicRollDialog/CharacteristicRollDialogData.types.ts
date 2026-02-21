import type { RollHeaderData } from "../app-parts/rollHeader.types.ts";
import type { RollFooterData } from "../app-parts/rollFooter.types.ts";

export type CharacteristicRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: CharacteristicRollDialogFormData;

    speakerName: string;
    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
    difficultyOptions: SelectOptionData<number>[];
  };

export type CharacteristicRollDialogFormData = {
  difficulty: number;
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;

  actorUuid: string; // hidden field
  characteristicName: string; // hidden field
  characteristicValue: number; // hidden field
};
