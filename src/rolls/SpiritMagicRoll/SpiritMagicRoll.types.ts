export type Modifier = { description: string; value: number };

export type SpiritMagicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  powX5: number;
  levelUsed: number;
  magicPointBoost?: number;
  modifiers?: Modifier[];
  spellName?: string;
  spellImg?: string;
  speaker?: ChatMessage.SpeakerData;
  rollMode?: CONST.DICE_ROLL_MODES;
};
