import { CharacteristicCard } from "./characteristicCard";
import { ItemCard } from "./itemCard";
import { WeaponCard } from "./weaponCard";
import { SpiritMagicCard } from "./spiritMagicCard";

export class ChatCardListeners {
  private static card = {
    characteristicCard: CharacteristicCard,
    itemCard: ItemCard,
    spiritMagicCard: SpiritMagicCard,
    weaponCard: WeaponCard,
  };

  public static init() {
    // Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
    Hooks.on("renderChatLog", (chatLog, html) => {
      ChatCardListeners.addChatListeners(html);
    });
    Hooks.on("renderChatPopout", (chatLog, html) => {
      ChatCardListeners.addChatListeners(html);
    });
  }

  private static addChatListeners(html) {
    html.on("submit", "form", ChatCardListeners.formSubmitHandler);
    html.on("change", "input", ChatCardListeners.inputChangeHandler);
    html.on("change", "select", ChatCardListeners.inputChangeHandler);
  }

  private static formSubmitHandler(ev): void {
    const chatCard = ev.target.dataset.chatCard;
    const chatMessageId = ev.target.closest("[data-message-id]").dataset.messageId;
    ChatCardListeners.card[chatCard].formSubmitHandler(ev, chatMessageId);
  }

  private static inputChangeHandler(ev): void {
    const chatCard = ev.target.closest("form").dataset.chatCard;
    const chatMessageId = ev.target.closest("[data-message-id]").dataset.messageId;
    ChatCardListeners.card[chatCard].inputChangeHandler(ev, chatMessageId);
  }
}
