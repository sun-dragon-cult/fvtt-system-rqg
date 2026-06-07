import type { RuneItem } from "@item-model/rune-data-model.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";

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
