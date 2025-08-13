import EvaluationOptions = RollTerm.EvaluationOptions;
import type { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import type { ItemTypeEnum } from "@item-model/itemTypes";
import type { RollMode } from "../../chat/chatMessage.types";
export type Modifier = { description: string; value: number };

export type AbilityRollOptions = Partial<EvaluationOptions> & {
  naturalSkill: number; // Unmodified chance
  modifiers?: Modifier[];
  /** Alternative roll heading, used instead of flavor */
  heading?: string;
  abilityName?: string; // Skill name
  abilityType?: ItemTypeEnum;
  abilityImg?: string; // Usually skill item image
  resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // Extra html to display in the roll
  speaker?: ChatSpeakerDataProperties;
  rollMode?: RollMode;
};
