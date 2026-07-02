import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

/** "fake" item to be able to handle reputation as Ability rolls */
export type PartialAbilityItem = {
  name: string | null;
  img: string | null;
  system: { chance: number };
  type?: Item.SubType;
  parent?: RqgActor | null;
  checkExperience?: (result: AbilitySuccessLevelEnum | undefined) => Promise<void>;
  /** Special handling for Reputation rolls */
  actingToken?: TokenDocument.Stored | TokenDocument.Implementation;
  uuid?: string;
  ownership?: { default: number }; // TODO should probably ber something like foundry.applications.apps.DocumentOwnershipConfig;
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
  abilityActorUuid?: string; // hidden field
  tokenUuid?: string; // hidden field
  reputationItemJson?: string; // hidden field - backup for uuid
  initialModifiersJson?: string; // hidden field
};
