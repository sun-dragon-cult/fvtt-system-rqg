import { CharacteristicCard } from "./characteristicCard";
import { RqgActor } from "../actors/rqgActor";

export type ChatCardName = "characteristicCard" | "itemCard";

export interface ChatCard {
  show(actor: RqgActor, data: any): Promise<void>;
  formSubmitHandler(ev): void;
  inputChangeHandler(ev): void;
}

export class ChatCards {
  private static card = {
    characteristicCard: new CharacteristicCard(),
    // itemCard: new ItemCard(),
  };

  public static init() {
    // Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
    Hooks.on("renderChatLog", (app, html, data) => {
      ChatCards.addChatListeners(html);
    });
    Hooks.on("renderChatPopout", (app, html, data) => {
      ChatCards.addChatListeners(html);
    });
  }

  public static async show(card: ChatCardName, actor: RqgActor, data: any): Promise<void> {
    await ChatCards.card[card].show(actor, data);
  }

  private static addChatListeners(html) {
    html.on("submit", "form", ChatCards.formSubmitHandler);
    html.on("change", "input", ChatCards.inputChangeHandler);
  }

  private static formSubmitHandler(ev): void {
    const chatCard = ev.target.dataset.chatCard;
    ChatCards.card[chatCard].formSubmitHandler(ev);
  }

  private static inputChangeHandler(ev): void {
    const chatCard = ev.target.closest("form").dataset.chatCard;
    ChatCards.card[chatCard].inputChangeHandler(ev);
  }
}
