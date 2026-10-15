import { RqgItemDataModel } from "./rqg-item-data-model";
import { abilitySchemaFields } from "../shared/ability-schema-fields";
import { RQG_CONFIG, systemId } from "../../system/config";
import { isDocumentSubType, localize, getSpeakerFromItem } from "../../system/util";
import { callRqgHook, callRqgPreHook, getSpeakerCompat } from "../../system/fvtt-type-compat";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { AbilityRoll } from "../../rolls/ability-roll/ability-roll";
import type { AbilityRollOptions } from "../../rolls/ability-roll/ability-roll.types";
import type { RollMethodOptions } from "../../rolls/roll-method-options";
import type { AbilityItem } from "./item-types";
import type { SkillItem } from "./skill-data-model";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqg-actor-data";
import { RqgLogger } from "../../system/logging/rqg-logger";
import { ERR } from "../../system/error-registry";
import { skillBehaviorOf, skillTargetUuids } from "../../system/skill-behaviors/skill-behavior";

const logger = new RqgLogger("AbilityDataModel");
type AbilitySchema = ReturnType<typeof abilitySchemaFields>;

/**
 * Abstract base DataModel for all ability item types (skill, rune, passion).
 * Provides shared roll logic and experience handling.
 */
export abstract class AbilityDataModel<
  Schema extends AbilitySchema,
  DerivedData extends Record<string, unknown> = Record<string, never>,
> extends RqgItemDataModel<Schema, DerivedData> {
  /** Open the roll dialog, or with `skipDialog` roll at once and return the roll. */
  async roll(options: RollMethodOptions = {}): Promise<AbilityRoll | undefined> {
    this.assertEmbedded();
    if (!options.skipDialog) {
      // Dynamic import to avoid circular dependency through AbilityRollDialogV2 → rqgItem.ts
      const { AbilityRollDialogV2 } =
        await import("../../applications/ability-roll-dialog/ability-roll-dialog-v2");
      await new AbilityRollDialogV2(this.parent as unknown as AbilityItem, options.token, {
        modifiers: options.modifiers,
      }).render({ force: true });
      return undefined;
    }
    return await this.rollWithOptions(this.rollOptions(options));
  }

  /** The options `roll` rolls with, before the hooks. */
  rollOptions(
    options: RollMethodOptions & Pick<AbilityRollOptions, "resultMessages">,
  ): AbilityRollOptions {
    const item = this.parent!;
    const actor = item.actor;
    return {
      naturalSkill: Number(this.chance) || 0, // Handle NaN
      modifiers: options.modifiers,
      abilityName: item.name ?? undefined,
      abilityType: item.type,
      abilityImg: item.img ?? undefined,
      resultMessages: options.resultMessages,
      speaker: actor ? getSpeakerCompat({ actor, token: options.token }) : getSpeakerFromItem(item),
      rollMode: options.rollMode,
    };
  }

  private assertEmbedded(): void {
    if (!this.parent?.isEmbedded) {
      logger.throw(ERR.abilityItemNotEmbedded, { itemUuid: this.parent?.uuid });
    }
  }

  /**
   * Roll with complete options, as the roll dialog and `roll` do: runs the `rqg.preAbilityRoll`
   * and `rqg.abilityRoll` hooks and checks experience. Undefined when a hook cancelled the roll.
   */
  async rollWithOptions(options: AbilityRollOptions): Promise<AbilityRoll | undefined> {
    this.assertEmbedded();
    const item = this.parent as unknown as AbilityItem;
    options.modifiers ??= [];
    if (!callRqgPreHook("rqg.preAbilityRoll", item, options)) {
      return undefined;
    }
    if (skillBehaviorOf(item)) {
      options.abilityUuid = item.uuid ?? undefined;
      options.targetUuids = skillTargetUuids(item);
    }
    const abilityRoll = await AbilityRoll.rollAndShow(options);
    if (abilityRoll.successLevel == null) {
      logger.throw(ERR.rollHasNoSuccessLevel, { roll: "AbilityRoll", abilityRoll });
    }
    callRqgHook("rqg.abilityRoll", item, abilityRoll, options);
    await this.checkExperience(abilityRoll.successLevel);
    return abilityRoll;
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

  /**
   * Apply a chance improvement and clear the current experience check.
   * Subclasses can override if they store gains in a different field.
   */
  async applyChanceGain(gain: number): Promise<void> {
    const item = this.parent;
    if (!item) {
      logger.error(ERR.improveTargetNotEmbedded);
      return;
    }

    const newChance = Number(item._source.system.chance) + gain;
    await item.update({ system: { hasExperience: false, chance: newChance } });
  }

  // Declared here to satisfy TypeScript since abilitySchemaFields provides them.
  // The actual values come from the schema definition in the subclass.
  declare chance: number;
  declare canGetExperience: boolean;
  declare hasExperience: boolean;
}
