import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { RollHeaderData } from "../app-parts/rollHeader.types.ts";
import type { RollFooterData } from "../app-parts/rollFooter.types.ts";

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

export type AbilityRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: AbilityRollDialogFormData;

    speakerName: string;
    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
  };

export type AbilityRollDialogFormData = {
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;

  abilityItemUuid?: string; // hidden field
  reputationItemJson?: string; // hidden field - backup for uuid
};
