import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

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
  tokenUuid: string; // hidden field
  characteristicName: string; // hidden field
  characteristicValue: number; // hidden field
};
