export type Modifier = { description: string; value: number };

export type ResistanceRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  activeValue: number;
  activeLabel: string;
  passiveValue: number;
  passiveLabel: string;
  /** Actor the passive value came from, if any (unset for a manual value). */
  passiveActorName?: string;
  modifiers?: Modifier[];
  speaker?: ChatMessage.SpeakerData;
  rollMode?: foundry.dice.Roll.Mode;
};
