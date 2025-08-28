import type { RqgItem } from "@items/rqgItem.ts";

export type Modifier = { description: string; value: number };

export type RuneMagicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  usedRune: RqgItem;
  runeMagicItem: RqgItem;
  levelUsed: number;
  magicPointBoost: number;
  modifiers: Modifier[];
  speaker: ChatMessage.SpeakerData;
  rollMode?: CONST.DICE_ROLL_MODES;
};
