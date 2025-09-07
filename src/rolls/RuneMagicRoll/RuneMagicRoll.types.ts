import type { RuneItem } from "@item-model/runeData.ts";
import type { RuneMagicItem } from "@item-model/runeMagicData.ts";

export type Modifier = { description: string; value: number };

export type RuneMagicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  usedRune: RuneItem;
  runeMagicItem: RuneMagicItem;
  levelUsed: number;
  magicPointBoost: number;
  modifiers: Modifier[];
  speaker: ChatMessage.SpeakerData;
  rollMode?: CONST.DICE_ROLL_MODES;
};
