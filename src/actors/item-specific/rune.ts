import { AbstractEmbeddedItem } from "./abstractEmbeddedItem";
import { RqgActor } from "../rqgActor";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { activateChatTab, localize } from "../../system/util";
import { ItemChatFlags } from "../../data-model/shared/rqgDocumentFlags";
import { ItemChatHandler } from "../../chat/itemChatHandler";

export class Rune extends AbstractEmbeddedItem {
  // public static init() {
  //   Items.registerSheet("rqg", RuneSheet, {
  //     types: [ItemTypeEnum.ElementalRune],
  //     makeDefault: true,
  //   });
  // }

  static async toChat(rune: RqgItem): Promise<void> {
    const flags: ItemChatFlags = {
      type: "itemChat",
      chat: {
        actorUuid: rune.actor!.uuid,
        tokenUuid: rune.actor!.token?.uuid,
        chatImage: rune.img ?? "",
        itemUuid: rune.uuid,
      },
      formData: {
        modifier: "",
      },
    };
    await ChatMessage.create(await ItemChatHandler.renderContent(flags));
  }

  static preUpdateItem(actor: RqgActor, rune: RqgItem, updates: any[], options: any): void {
    if (rune.data.type === ItemTypeEnum.Rune) {
      const chanceResult = updates.find((r) => r["data.chance"] != null);
      if (!chanceResult) {
        return;
      }
      if (rune.data.data.opposingRune) {
        const opposingRune = actor.items.getName(rune.data.data.opposingRune);
        this.adjustOpposingRuneChance(
          opposingRune,
          rune,
          actor,
          chanceResult["data.chance"],
          updates
        );
      }
    }
  }

  private static adjustOpposingRuneChance(
    opposingRune: RqgItem | undefined,
    item: RqgItem,
    actor: RqgActor,
    newChance: number,
    updates: object[]
  ) {
    if (!opposingRune || opposingRune.data.type !== ItemTypeEnum.Rune) {
      const msg = localize("RQG.Item.Notification.OpposingRuneDoesNotExistWarning");
      ui.notifications?.warn(msg);
      return;
    }
    const opposingRuneChance = opposingRune.data.data.chance;
    if (newChance + opposingRuneChance !== 100) {
      updates.push({
        _id: opposingRune.id,
        data: { chance: 100 - newChance },
      });
    }
  }
}
