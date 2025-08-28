import type { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import type { ItemTypeEnum } from "@item-model/itemTypes";
export type Modifier = { description: string; value: number };

export type AbilityRollOptions = Partial<Roll.Options> & {
  naturalSkill: number; // Unmodified chance
  modifiers?: Modifier[];
  /** Alternative roll heading, used instead of flavor */
  heading?: string;
  abilityName?: string; // Skill name
  abilityType?: ItemTypeEnum;
  abilityImg?: string; // Usually skill item image
  resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // Extra html to display in the roll
  speaker?: ChatMessage.SpeakerData;
  rollMode?: CONFIG.Dice.RollMode;
};
