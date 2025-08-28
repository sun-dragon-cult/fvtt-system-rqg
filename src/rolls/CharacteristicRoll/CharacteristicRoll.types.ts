export type Modifier = { description: string; value: number };

export type CharacteristicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  characteristicValue: number;
  characteristicName: string; // Characteristic name TODO type better
  difficulty?: number; // to multiply with characteristicValue
  modifiers?: Modifier[];
  speaker?: ChatMessage.SpeakerData;
  rollMode?: CONST.DICE_ROLL_MODES;
};
