import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { assertItemType, formatModifier, localize, RqgError } from "../../system/util";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import { SkillDataPropertiesData } from "../../data-model/item-data/skillData";
import { documentRqidFlags, ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";
import { ResultEnum } from "../../data-model/shared/ability";
import { systemId } from "../../system/config";
import { RqgActor } from "../../actors/rqgActor";
import { requestSkillSpecializationDialog } from "../../applications/requestSkillSpecialization";
import { concatenateSkillName } from "./concatenateSkillName";

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

  public static async abilityRoll(skill: RqgItem, options: any): Promise<ResultEnum> {
    assertItemType(skill?.data.type, ItemTypeEnum.Skill);
    const chance: number = Number(skill.data.data.chance) || 0;
    let flavor = localize("RQG.Dialog.itemChat.RollFlavor", { name: skill.name });
    if (options.modifier && options.modifier !== 0) {
      flavor += localize("RQG.Dialog.itemChat.RollFlavorModifier", {
        modifier: formatModifier(options.modifier),
      });
    }
    const speaker = ChatMessage.getSpeaker({ actor: skill.actor ?? undefined });
    const result = await skill._roll(flavor, chance, options.modifier, speaker);
    await skill.checkExperience(result);
    return result;
  }

  public static onActorPrepareDerivedData(skillItem: RqgItem): RqgItem {
    if (skillItem.data.type !== ItemTypeEnum.Skill) {
      const msg = localize("RQG.Item.Notification.PrepareDerivedDataNotSkillError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, skillItem);
    }
    const skillData = skillItem.data.data;
    const actor = skillItem.actor!;
    if (actor.data.type !== ActorTypeEnum.Character) {
      const msg = localize("RQG.Item.Notification.ActorNotCharacterError");
      ui.notifications?.error(msg);
      throw new RqgError(msg, actor);
    }
    const actorData = actor.data.toObject(false);
    // Add the category modifier to be displayed by the Skill sheet TODO make another method for this!
    skillData.categoryMod = actorData.data.skillCategoryModifiers![skillItem.data.data.category];

    let mod = 0;

    // Special case for Dodge, Jump & Move Quietly
    const dex = actorData.data.characteristics.dexterity.value;
    const skillRqid = skillItem.getFlag(systemId, documentRqidFlags)?.id;
    if (skillRqid === CONFIG.RQG.skillRqid.dodge) {
      Skill.updateBaseChance(skillData, dex * 2);
      mod = -Math.min(
        // mod is equipped ENC modifier
        actorData.data.attributes.encumbrance?.equipped || 0,
        actorData.data.attributes.encumbrance?.max || 0
      );
    } else if (skillRqid === CONFIG.RQG.skillRqid.jump) {
      Skill.updateBaseChance(skillData, dex * 3);
    } else if (skillRqid === CONFIG.RQG.skillRqid.moveQuietly) {
      mod = -Math.max(
        0,
        ...actor.items
          .filter(
            (i: RqgItem) =>
              i.data.type === ItemTypeEnum.Armor && i.data.data.equippedStatus === "equipped"
          )
          .map((a: any) => Math.abs(a.data.data.moveQuietlyPenalty))
      );
    }

    // Calculate the effective skill chance including skill category modifier.
    // If skill base chance is 0 you need to have studied to get an effective chance
    skillData.chance =
      skillData.baseChance > 0 || skillData.baseChance + skillData.gainedChance > 0
        ? Math.max(
            0,
            skillData.baseChance + skillData.gainedChance + (skillData.categoryMod || 0) + mod
          )
        : 0;
    return skillItem;
  }

  static async onEmbedItem(
    actor: RqgActor,
    skillItem: RqgItem,
    options: any,
    userId: string
  ): Promise<any> {
    let updateData;
    assertItemType(skillItem?.data.type, ItemTypeEnum.Skill);

    try {
      const answer = await requestSkillSpecializationDialog(skillItem);
      if (answer) {
        updateData = {
          _id: skillItem.id,
          name: concatenateSkillName(skillItem.data.data.skillName, answer),
          data: { specialization: answer },
        };
      }
    } catch (e) {
      // Delete the item if the user cancels the dialog
      skillItem.id && (await actor.deleteEmbeddedDocuments("Item", [skillItem.id]));
    }

    return updateData;
  }

  private static updateBaseChance(skillData: SkillDataPropertiesData, newBaseChance: number): void {
    if (skillData.baseChance !== newBaseChance) {
      skillData.baseChance = newBaseChance;
    }
  }
}
