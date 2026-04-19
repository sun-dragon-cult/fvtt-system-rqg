export type Modifier = { description: string; value: number };

/** Default difficulty multiplier for characteristic rolls (×5) */
export const DEFAULT_DIFFICULTY = 5;

export type CharacteristicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  characteristicValue: number;
  characteristicName: string; // Characteristic name TODO type better
  difficulty?: number; // to multiply with characteristicValue
  modifiers?: Modifier[];
  speaker?: ChatMessage.SpeakerData;
  rollMode?: CONST.DICE_ROLL_MODES;
};
