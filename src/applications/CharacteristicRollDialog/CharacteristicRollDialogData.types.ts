import type { RollMode } from "../../chat/chatMessage.types";

export type CharacteristicRollDialogContext = {
  formData: CharacteristicRollDialogFormData;

  augmentOptions: SelectOptionData<number>[];
  meditateOptions: SelectOptionData<number>[];
  difficultyOptions: SelectOptionData<number>[];
  totalChance: number;
  speakerName: string;
  rollMode: RollMode; // read in onSubmit by checking the active class
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
