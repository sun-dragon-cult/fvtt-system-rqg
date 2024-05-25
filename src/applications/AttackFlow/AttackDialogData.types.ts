import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";
import type { UsageType } from "../../data-model/item-data/weaponData";
import type { RqgItem } from "../../items/rqgItem";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  type?: ItemTypeEnum;
  img: string | null;
  system: { chance: number };
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
};

export type AttackDialogHandlebarsData = {
  // abilityName: string | null;
  // abilityType?: string;
  // abilityImg: string | null;
  weaponItem: RqgItem;
  abilityChance: number;

  object: AttackDialogObjectData;
  options: FormApplication.Options;
  title: string;
  usageTypeOptions: Record<string, string>;
  augmentOptions: Record<string, string>; // TODO Actually <number, string>
  totalChance: number;
};

export type AttackDialogObjectData = {
  usageType: UsageType;
  augmentModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};
