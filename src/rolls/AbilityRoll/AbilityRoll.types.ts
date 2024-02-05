import EvaluationOptions = RollTerm.EvaluationOptions;
import { AbilitySuccessLevelEnum } from "./AbilityRoll.defs";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export type Modifier = { description: string; value: number };

export type AbilityRollOptions = Partial<EvaluationOptions> & {
  naturalSkill: number; // Unmodified chance
  modifiers?: Modifier[];
  abilityName?: string; // Skill name
  abilityType?: ItemTypeEnum;
  abilityImg?: string; // Usually skill item image
  useSpecialCriticals?: boolean;
  resultMessages?: Map<AbilitySuccessLevelEnum | undefined, string>; // Extra html to display in the roll
};
