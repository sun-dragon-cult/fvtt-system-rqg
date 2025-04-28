export type CharacteristicRollDialogContext = {
  formData: CharacteristicRollDialogFormData;

  augmentOptions: SelectOptionData<number>[];
  meditateOptions: SelectOptionData<number>[];
  difficultyOptions: SelectOptionData<number>[];
  totalChance: number;
  speakerName: string;
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
