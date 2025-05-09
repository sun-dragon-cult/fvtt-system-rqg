import EvaluationOptions = RollTerm.EvaluationOptions;
import type { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import type { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
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
