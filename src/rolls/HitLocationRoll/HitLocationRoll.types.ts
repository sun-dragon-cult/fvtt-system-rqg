export type HitLocationName = {
  dieFrom: number;
  dieTo: number;
  name: string;
};

export type HitLocationRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  hitLocationNames: HitLocationName[];
  speaker?: ChatMessage.SpeakerData;
};
