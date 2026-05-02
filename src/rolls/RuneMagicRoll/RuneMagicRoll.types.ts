import type { RuneItem } from "@item-model/runeDataModel.ts";
import type { RuneMagicItem } from "@item-model/runeMagicDataModel.ts";

export type Modifier = { description: string; value: number };

export type RuneMagicRollOptions = Partial<foundry.dice.terms.DiceTerm.EvaluationOptions> & {
  usedRune: RuneItem;
  runeMagicItem: RuneMagicItem;
  levelUsed: number;
  magicPointBoost: number;
  modifiers: Modifier[];
  speaker: ChatMessage.SpeakerData;
  rollMode?: foundry.dice.Roll.Mode;
};
