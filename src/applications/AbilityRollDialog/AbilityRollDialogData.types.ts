import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "../../actors/rqgActor";
import type { RollMode } from "../../chat/chatMessage.types";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  img: string | null;
  system: { chance: number };
  type?: ItemTypeEnum;
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
  /** Special handling for Reputation rolls */
  actingToken?: TokenDocument;
  uuid?: string;
};

export type AbilityRollDialogContext = {
  formData: AbilityRollDialogFormData;
  abilityItem: PartialAbilityItem;
  augmentOptions: SelectOptionData<number>[];
  meditateOptions: SelectOptionData<number>[];
  totalChance: number;
  speakerName: string;
  rollMode: RollMode; // read in onSubmit by checking the active class
};

export type AbilityRollDialogFormData = {
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
  abilityItemUuid?: string; // hidden field
  reputationItemJson?: string; // hidden field - backup for uuid
};
