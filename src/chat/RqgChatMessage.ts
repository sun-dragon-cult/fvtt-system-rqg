import { ReputationCard } from "./reputationCard";
import { CharacteristicCard } from "./characteristicCard";
import {
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  getRequiredDomDataset,
  localize,
  moveCursorToEnd,
  requireValue,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { RqidLink } from "../data-model/shared/rqidLink";
import { ItemCard } from "./itemCard";
import { SpiritMagicCard } from "./spiritMagicCard";
import { RuneMagicCard } from "./runeMagicCard";
import { WeaponCard } from "./weaponCard";

export type ChatCardType = keyof typeof cardMap;

const cardMap = {
  characteristicCard: CharacteristicCard,
  itemCard: ItemCard,
  spiritMagicCard: SpiritMagicCard,
  runeMagicCard: RuneMagicCard,
  weaponCard: WeaponCard,
  reputationCard: ReputationCard,
};

export class RqgChatMessage extends ChatMessage {
  public static init() {
    CONFIG.ChatMessage.documentClass = RqgChatMessage;
    // CONFIG.ChatMessage.template = "systems/rqg/chat/chat-message.hbs"; // TODO redefine the base chat card

    Hooks.on("renderChatLog", (chatLog: any, html: JQuery) => {
      RqgChatMessage.addChatListeners(html[0]);
    });
    Hooks.on("renderChatPopout", (chatPopout: any, html: JQuery) => {
      if (html === chatPopout._element) {
        // This is called on chatMessage.update as well with different html - resulting in double listeners.
        // To prevent that check that html (which is a li.chat-message element in case of update) is the same as
        // chatPopout.element (which always is div.chat-popout)
        RqgChatMessage.addChatListeners(html[0]);
      }
    });
    Hooks.on("renderChatMessage", (chatItem, html) => {
      RqidLink.addRqidLinkClickHandlers(html); // TODO this might not work if rqid points to compendium (async)
    });
  }

  private static addChatListeners(html: HTMLElement): void {
    html.addEventListener("submit", RqgChatMessage.initialFormSubmitHandler);
    html.addEventListener("input", RqgChatMessage.inputChangeHandler);
    html.addEventListener("change", RqgChatMessage.inputChangeHandler);
  }

  private static async initialFormSubmitHandler(submitEvent: SubmitEvent): Promise<void> {
    const { chatCardType, chatMessageId } = RqgChatMessage.getChatCardInfo(submitEvent);

    await cardMap[chatCardType].formSubmitHandler(submitEvent, chatMessageId);
  }

  private static async inputChangeHandler(inputEvent: Event): Promise<void> {
    if ((inputEvent.target as Element)?.classList.contains("roll-type-select")) {
      return; // Don't handle foundry roll type select dropdown
    }
    // if (!(inputEvent instanceof InputEvent || inputEvent instanceof Event)) {
    //   return; // TODO Throw error
    // }
    const { chatCardType, chatMessageId } = RqgChatMessage.getChatCardInfo(inputEvent);
    const chatMessage = getGame().messages?.get(chatMessageId);
    requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));

    const flags = chatMessage.data.flags.rqg;
    requireValue(flags, "No rqg flags found on chat card");
    // const chatCardType = flags?.type;
    requireValue(chatCardType, "Found chatmessage without chatCardType");

    // TODO call right method
    cardMap[chatCardType].updateFlagsFromForm(flags, inputEvent);
    const data = await cardMap[chatCardType].renderContent(flags);

    // const data = await ReputationCard.renderContent(flags);
    const domChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const domChatMessage = Array.from(domChatMessages).find((m) =>
      m.contains(inputEvent.currentTarget as Node)
    );
    const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");

    await chatMessage.update(data); // Rerenders the dom chatmessages
    const newDomChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const newDomChatMessage = Array.from(newDomChatMessages).find(
      (m) => !!m.closest<HTMLElement>(".chat-popout") === isFromPopoutChat
    );

    // Find the input element that inititated the change and move the cursor there.
    const inputElement = inputEvent.target;
    if (inputElement instanceof HTMLInputElement && inputElement.type === "text") {
      const elementName = inputElement?.name;
      const newInputElement = newDomChatMessage?.querySelector<HTMLInputElement>(
        `[name=${elementName}]`
      );
      newInputElement && moveCursorToEnd(newInputElement);
    }
    // @ts-ignore is marked as private!?
    ui.chat?.scrollBottom(); // Fix that the weapon card gets bigger and pushes the rest of the chatlog down
  }

  public async doRoll(): Promise<void> {
    requireValue(this.data.flags.rqg?.type, "Got a chatcard without a type");
    // cardMap[this.data.flags.rqg?.type].roll("");
    // TODO how to generalise the roll parameters???
  }

  public static async formSubmitHandler(ev: SubmitEvent, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const button = ev.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg;
    requireValue(flags, "Couldn't find flags on chatmessage");

    const cardType = flags.type;

    cardMap[cardType].updateFlagsFromForm(flags, ev);

    const form = ev.target as HTMLFormElement;
    // Disable form until completed
    form.style.pointerEvents = "none";
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    // TODO *** Is this actually rollData and is there a rollData method on ChatMessage already (or is that only for rolls)
    const rollData = await cardMap[cardType].getFormDataFromFlags(flags);
    // const { reputationValue, modifier } = await ReputationCard.getFormDataFromFlags(flags);

    // TODO encapsulating parameters into an object could work?
    await cardMap[cardType].roll(rollData, ChatMessage.getSpeaker({ actor: actor, token: token }));
    // Enabling the form again after DsN animation is finished TODO doesn't wait
    form.style.pointerEvents = "auto";
    return false;
  }

  private static getChatCardInfo(event: Event): {
    chatCardType: ChatCardType;
    chatMessageId: string;
  } {
    const chatCardType = getRequiredDomDataset(event, "chat-card") as ChatCardType;
    const chatMessageId = getRequiredDomDataset(event, "message-id");
    return { chatCardType: chatCardType, chatMessageId: chatMessageId };
  }

  // TODO Implement via getHTML in each chatcard and move away from static functions?
  // TODO How to get templateData then?
  // getHTML(): Promise<JQuery> {
  //   const flags = this.data.flags;
  //   const chatMessageType = flags.rqg?.type;
  //   if (chatMessageType) {
  //     return CONFIG.RQG.chatMessages[chatMessageType].getHTML();
  //   }
  //   const msg = "Unexpected Chat Message type when generating Chat Message HTML";
  //   throw new RqgError(msg, this);
  // }
}
