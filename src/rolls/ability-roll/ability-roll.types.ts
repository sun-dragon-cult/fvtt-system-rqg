import type { AbilitySuccessLevelEnum } from "./ability-roll.defs";

export type Modifier = { description: string; value: number };

export type AbilityRollOptions = Partial<Roll.Options> & {
  naturalSkill: number; // Unmodified chance
  modifiers?: Modifier[];
  /** Alternative roll heading, used instead of flavor */
  heading?: string;
  abilityName?: string; // Skill name
  abilityType?: Item.SubType;
  abilityImg?: string; // Usually skill item image
  /** Set when the skill has a behavior, so the roll card can offer Apply */
  abilityUuid?: string;
  /** The targeted tokens, or the rolling actor when nothing was targeted */
  targetUuids?: string[];
  /** Extra html to display in the roll, by success level. A Map is stored as a plain object. */
  resultMessages?:
    Map<AbilitySuccessLevelEnum | undefined, string> | Partial<Record<string, string>>;
  speaker?: ChatMessage.SpeakerData;
  rollMode?: foundry.dice.Roll.Mode;
};
