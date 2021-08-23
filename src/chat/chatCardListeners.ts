import { CharacteristicCard } from "./characteristicCard";
import { ItemCard } from "./itemCard";
import { WeaponCard } from "./weaponCard";
import { SpiritMagicCard } from "./spiritMagicCard";
import { getDomDataset, RqgError } from "../system/util";

export class ChatCardListeners {
  private static card = {
    characteristicCard: CharacteristicCard,
    itemCard: ItemCard,
    spiritMagicCard: SpiritMagicCard,
    weaponCard: WeaponCard,
  };

  public static init(): void {
    Hooks.on("renderChatLog", (chatLog: any, html: JQuery) => {
      ChatCardListeners.addChatListeners(html);
    });
    Hooks.on("renderChatPopout", (chatPopout: any, html: JQuery) => {
      if (html === chatPopout._element) {
        // This is called on chatMessage.update as well with different html - resulting in double listeners.
        // To prevent that check that html (which is a li.chat-message element in case of update) is the same as
        // chatPopout.element (which always is div.chat-popout)
        ChatCardListeners.addChatListeners(html);
      }
    });
  }

  private static addChatListeners(html: JQuery): void {
    html.on("submit", "form", ChatCardListeners.formSubmitHandler);
    html.on("input", "input", ChatCardListeners.inputChangeHandler);
    html.on("change", "select", ChatCardListeners.inputChangeHandler);
  }

  private static async formSubmitHandler(ev: JQueryEventObject): Promise<void> {
    const chatCard = getDomDataset(ev, "chat-card");
    const chatMessageId = getDomDataset(ev, "message-id");
    if (!chatMessageId || !chatCard || !(chatCard in ChatCardListeners.card)) {
      const msg = `Couldn't find chatCard [${chatCard}] or chatMessageId [${chatMessageId}] while submitting a chat card form.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, ev);
    }
    await ChatCardListeners.card[chatCard as keyof typeof ChatCardListeners.card].formSubmitHandler(
      ev,
      chatMessageId
    );
  }

  private static async inputChangeHandler(ev: JQueryEventObject): Promise<void> {
    const chatCard = getDomDataset(ev, "chat-card");
    const chatMessageId = getDomDataset(ev, "message-id");
    if (ev.target.classList.contains("roll-type-select")) {
      return; // No need to handle foundry roll type select dropdown
    }
    if (!chatMessageId || !chatCard || !(chatCard in ChatCardListeners.card)) {
      const msg = `Couldn't find chatCard [${chatCard}] or chatMessageId [${chatMessageId}] while processing a chat card change event.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, ev);
    }
    await ChatCardListeners.card[
      chatCard as keyof typeof ChatCardListeners.card
    ].inputChangeHandler(ev, chatMessageId);
  }
}
