import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { RQG_CONFIG, systemId } from "../../system/config";
import { isDocumentSubType, localize, RqgError, getSpeakerFromItem } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";
import { AbilityRoll } from "../../rolls/AbilityRoll/AbilityRoll";
import type { AbilityRollOptions } from "../../rolls/AbilityRoll/AbilityRoll.types";
import type { AbilityItem } from "./itemTypes";
import type { SkillItem } from "./skillDataModel";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";

type AbilitySchema = ReturnType<typeof abilitySchemaFields>;

/**
 * Abstract base DataModel for all ability item types (skill, rune, passion).
 * Provides shared roll logic and experience handling.
 */
export abstract class AbilityDataModel<
  Schema extends AbilitySchema,
  DerivedData extends Record<string, unknown> = Record<string, never>,
> extends RqgItemDataModel<Schema, DerivedData> {
  /**
   * Open a dialog for an AbilityRoll.
   */
  async abilityRoll(): Promise<void> {
    // Dynamic import to avoid circular dependency through AbilityRollDialogV2 → rqgItem.ts
    const { AbilityRollDialogV2 } =
      await import("../../applications/AbilityRollDialog/abilityRollDialogV2");
    await new AbilityRollDialogV2(this.parent as unknown as AbilityItem).render(true);
  }

  /**
   * Do an abilityRoll and handle checking experience afterward.
   */
  async abilityRollImmediate(
    options: Omit<AbilityRollOptions, "naturalSkill" | "abilityItem"> = {},
  ): Promise<void> {
    const item = this.parent;
    if (!item?.isEmbedded) {
      const msg = "Item is not embedded";
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }

    const chance: number = Number(this.chance) || 0; // Handle NaN

    const abilityRoll = await AbilityRoll.rollAndShow({
      naturalSkill: chance,
      modifiers: options?.modifiers,
      abilityName: item.name ?? undefined,
      abilityType: item.type,
      abilityImg: item.img ?? undefined,
      resultMessages: options?.resultMessages,
      speaker: getSpeakerFromItem(item),
      rollMode: options?.rollMode,
    });
    if (abilityRoll.successLevel == null) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }
    await this.checkExperience(abilityRoll.successLevel);
  }

  /**
   * Give an experience check to this item if the result is a success or greater
   * and the item can get experience.
   * A successful Worship skill roll also awards the actor a POW experience check.
   * A successful Spirit Combat skill roll with a chance below 95% also awards POW experience.
   */
  async checkExperience(result: AbilitySuccessLevelEnum | undefined): Promise<void> {
    const item = this.parent;
    const isSuccess = result != null && result <= AbilitySuccessLevelEnum.Success;
    if (isSuccess && !this.hasExperience) {
      await this.awardExperience();
    }
    const rqid = item?.getFlag(systemId, "documentRqidFlags")?.id;
    // Use string literal "skill" to avoid circular dep through ItemTypeEnum → itemTypes.ts → skill.ts → rqgItem.ts
    if (
      isSuccess &&
      isDocumentSubType<SkillItem>(item, "skill" as Item.SubType) &&
      (rqid?.startsWith(RQG_CONFIG.skillRqid.worship) || rqid === RQG_CONFIG.skillRqid.spiritCombat)
    ) {
      const actor = item.actor;
      if (actor && isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character)) {
        await actor.awardPowExperience();
      }
    }
  }

  async awardExperience(): Promise<void> {
    const item = this.parent;
    if (this.canGetExperience && !this.hasExperience) {
      await item?.actor?.updateEmbeddedDocuments("Item", [
        { _id: item.id, system: { hasExperience: true } },
      ]);
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: item?.actor?.name ?? "",
        itemName: item?.name,
      });
      ui.notifications?.info(msg);
    }
  }

  // Declared here to satisfy TypeScript since abilitySchemaFields provides them.
  // The actual values come from the schema definition in the subclass.
  declare chance: number;
  declare canGetExperience: boolean;
  declare hasExperience: boolean;
}
