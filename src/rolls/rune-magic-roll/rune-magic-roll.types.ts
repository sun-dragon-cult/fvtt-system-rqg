export type Modifier = { description: string; value: number };

export type RuneMagicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  usedRuneName: string;
  usedRuneChance: number;
  spellName: string;
  spellImg?: string;
  isOneUse: boolean;
  levelUsed: number;
  magicPointBoost: number;
  modifiers: Modifier[];
  speaker: ChatMessage.SpeakerData;
  rollMode?: foundry.dice.Roll.Mode;
};

export type RuneMagicRollImmediateOptions = Partial<
  Pick<RuneMagicRollOptions, "levelUsed" | "magicPointBoost" | "modifiers" | "rollMode">
> & {
  usedRuneId?: string;
};
