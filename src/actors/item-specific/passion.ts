import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";
import { assertItemType, formatModifier, localize } from "../../system/util";
import { ResultEnum } from "../../data-model/shared/ability";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

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

  public static async abilityRoll(passion: RqgItem, options: any): Promise<ResultEnum> {
    assertItemType(passion?.data.type, ItemTypeEnum.Passion);
    const chance: number = Number(passion.data.data.chance) || 0;
    let flavor = localize("RQG.Dialog.itemChat.RollFlavor", { name: passion.name });
    if (options.modifier && options.modifier !== 0) {
      flavor += localize("RQG.Dialog.itemChat.RollFlavorModifier", {
        modifier: formatModifier(options.modifier),
      });
    }
    const speaker = ChatMessage.getSpeaker({ actor: passion.actor ?? undefined });
    const result = await passion._roll(flavor, chance, options.modifier, speaker);
    await passion.checkExperience(result);
    return result;
  }
}
