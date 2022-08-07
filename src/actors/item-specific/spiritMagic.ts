import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { activateChatTab, assertItemType } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SpiritMagicChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { SpiritMagicChatHandler } from "../../chat/spiritMagicChatHandler";
import { RqgItem } from "../../items/rqgItem";

export class SpiritMagic extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", SpiritMagicSheet, {
  //     types: [ItemTypeEnum.SpiritMagic],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(spiritMagic: RqgItem): Promise<void> {
    assertItemType(spiritMagic.data.type, ItemTypeEnum.SpiritMagic);

    const flags: SpiritMagicChatFlags = {
      type: "spiritMagicChat",
      chat: {
        actorUuid: spiritMagic.actor!.uuid,
        tokenUuid: spiritMagic.actor!.token?.uuid,
        chatImage: spiritMagic.img ?? "",
        itemUuid: spiritMagic.uuid,
      },
      formData: {
        level: spiritMagic.data.data.points.toString(),
        boost: "",
      },
    };

    await ChatMessage.create(await SpiritMagicChatHandler.renderContent(flags));
  }
}
