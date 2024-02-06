import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgItem } from "../rqgItem";
import { ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";
import { assertItemType } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { AbilitySuccessLevelEnum } from "../../rolls/AbilityRoll/AbilityRoll.defs";

export class Passion extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", PassionSheet, {
  //     types: [ItemTypeEnum.Passion],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(passion: RqgItem): Promise<void> {
    const flags: ItemChatFlags = {
      type: "itemChat",
      chat: {
        actorUuid: passion.actor!.uuid,
        tokenUuid: passion.actor!.token?.uuid,
        chatImage: passion.img ?? "",
        itemUuid: passion.uuid,
      },
      formData: {
        modifier: "",
      },
    };
    await ChatMessage.create(await ItemChatHandler.renderContent(flags));
  }

  public static async abilityRoll(
    passion: RqgItem,
    options: any,
  ): Promise<AbilitySuccessLevelEnum> {
    assertItemType(passion?.type, ItemTypeEnum.Passion);
    const chance: number = Number(passion.system.chance) || 0;
    const speaker = ChatMessage.getSpeaker({ actor: passion.actor ?? undefined });
    const result = await passion._roll(
      chance,
      [{ description: "Other Modifiers", value: options.modifier }],
      speaker,
    );
    await passion.checkExperience(result);
    return result;
  }
}
