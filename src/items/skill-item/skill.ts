import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, localize, RqgError } from "../../system/util";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import { SkillDataPropertiesData } from "../../data-model/item-data/skillData";
import { documentRqidFlags, ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";
import { systemId } from "../../system/config";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";

export class Skill extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", SkillSheet, {
  //     types: [ItemTypeEnum.Skill],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(skill: RqgItem): Promise<void> {
    const flags: ItemChatFlags = {
      type: "itemChat",
      chat: {
        actorUuid: skill.actor!.uuid,
        tokenUuid: skill.actor!.token?.uuid,
        chatImage: skill.img ?? "",
        itemUuid: skill.uuid,
      },
      formData: {
        modifier: "",
      },
    };
    await ChatMessage.create(await ItemChatHandler.renderContent(flags));
  }

  public static async abilityRoll(skill: RqgItem, options: any): Promise<AbilitySuccessLevelEnum> {
    assertItemType(skill?.type, ItemTypeEnum.Skill);
    const chance: number = Number(skill.system.chance) || 0;
    const speaker = ChatMessage.getSpeaker({ actor: skill.actor ?? undefined });
    const result = await skill._roll(
      chance,
      [{ description: "Other Modifiers", value: options.modifier }],
      speaker,
    );
    await skill.checkExperience(result);
    return result;
  }

  public static onActorPrepareDerivedData(skillItem: RqgItem): RqgItem {
    if (skillItem.type !== ItemTypeEnum.Skill) {
      const msg = localize("RQG.Item.Notification.PrepareDerivedDataNotSkillError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, skillItem);
    }
    const skillData = skillItem.system;
    const actor = skillItem.actor!;
    if (actor.type !== ActorTypeEnum.Character) {
      const msg = localize("RQG.Item.Notification.ActorNotCharacterError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }
    // @ts-expect-error system
    const actorData = actor.toObject(false).system; // TODO Why use toObject ???
    // Add the category modifier to be displayed by the Skill sheet TODO make another method for this!
    skillData.categoryMod = actorData.skillCategoryModifiers![skillItem.system.category];

    let mod = 0;

    // Special case for Dodge, Jump & Move Quietly
    const dex = actorData.characteristics.dexterity.value;
    const skillRqid = skillItem.getFlag(systemId, documentRqidFlags)?.id;
    if (skillRqid === CONFIG.RQG.skillRqid.dodge) {
      Skill.updateBaseChance(skillData, dex * 2);
      mod = -Math.min(
        // mod is equipped ENC modifier
        actorData.attributes.encumbrance?.equipped || 0,
        actorData.attributes.encumbrance?.max || 0,
      );
    } else if (skillRqid === CONFIG.RQG.skillRqid.jump) {
      Skill.updateBaseChance(skillData, dex * 3);
    } else if (skillRqid === CONFIG.RQG.skillRqid.moveQuietly) {
      mod = -Math.max(
        0,
        ...actor.items
          .filter(
            (i: RqgItem) => i.type === ItemTypeEnum.Armor && i.system.equippedStatus === "equipped",
          )
          .map((a: any) => Math.abs(a.system.moveQuietlyPenalty)),
      );
    }

    // Calculate the effective skill chance including skill category modifier.
    // If skill base chance is 0 you need to have studied to get an effective chance
    skillData.chance =
      skillData.baseChance > 0 || skillData.baseChance + skillData.gainedChance > 0
        ? Math.max(
            0,
            skillData.baseChance + skillData.gainedChance + (skillData.categoryMod || 0) + mod,
          )
        : 0;
    return skillItem;
  }

  private static updateBaseChance(skillData: SkillDataPropertiesData, newBaseChance: number): void {
    if (skillData.baseChance !== newBaseChance) {
      skillData.baseChance = newBaseChance;
    }
  }
}
