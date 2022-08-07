import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgItem } from "../../items/rqgItem";
import { ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";
import { activateChatTab } from "../../system/util";

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
}
