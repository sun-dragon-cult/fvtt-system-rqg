import { Ability, ResultEnum } from "../data-model/shared/ability";
import {
  activateChatTab,
  formatModifier,
  getGame,
  localize,
  moveCursorToEnd,
  RqgError,
  usersThatOwnActor,
  assertChatMessageFlagType,
  getDocumentFromUuid,
  getRequiredDocumentFromUuid,
  convertFormValueToInteger,
  cleanIntegerString,
  requireValue,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { ItemCardFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";

export class ItemCard {
  public static async show(
    itemId: string,
    actor: RqgActor,
    token: TokenDocument | undefined
  ): Promise<void> {
    const item = actor.items.get(itemId);
    if (!item || !("chance" in item.data.data) || item.data.data.chance == null) {
      const msg = localize("RQG.Item.Notification.ItemWithIdDoesNotHaveChanceError", {
        itemId: itemId,
        actorName: actor.name,
      });
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }

    const flags: ItemCardFlags = {
      type: "item",
      card: {
        actorUuid: actor.uuid,
        tokenUuid: token?.uuid,
        chatImage: item.data.img ?? "",
        itemUuid: item.uuid,
      },
      formData: {
        modifier: "",
      },
    };

    await ChatMessage.create(await ItemCard.renderContent(flags));
    activateChatTab();
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));

    const flags = chatMessage?.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "item");
    ItemCard.updateFlagsFromForm(flags, ev);

    const data = await ItemCard.renderContent(flags);
    const domChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const domChatMessage = Array.from(domChatMessages).find((m) =>
      m.contains(ev.currentTarget as Node)
    );
    const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");
    await chatMessage.update(data); // Rerenders the dom chatmessages

    const newDomChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const newDomChatMessage = Array.from(newDomChatMessages).find(
      (m) => !!m.closest(".chat-popout") === isFromPopoutChat
    );

    // Find the input element that inititated the change and move the cursor there.
    const inputElement = ev.target;
    if (inputElement instanceof HTMLInputElement && inputElement.type === "text") {
      const elementName = inputElement?.name;
      const newInputElement = newDomChatMessage?.querySelector<HTMLInputElement>(
        `[name=${elementName}]`
      );
      newInputElement && moveCursorToEnd(newInputElement);
    }
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    const button = (ev.originalEvent as SubmitEvent).submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "item");
    ItemCard.updateFlagsFromForm(flags, ev);

    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const item = await getRequiredDocumentFromUuid<RqgItem>(flags.card.itemUuid);

    const { modifier } = await ItemCard.getFormDataFromFlags(flags);

    await ItemCard.roll(
      item,
      modifier,
      actor,
      ChatMessage.getSpeaker({ actor: actor, token: token })
    );
    return false;
  }

  public static async roll(
    item: RqgItem,
    modifier: number,
    actor: RqgActor,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    const chance: number = Number((item?.data.data as any).chance) || 0;
    let flavor = localize("RQG.Dialog.itemCard.RollFlavor", { name: item.name });
    if (modifier !== 0) {
      flavor += localize("RQG.Dialog.itemCard.RollFlavorModifier", {
        modifier: formatModifier(modifier),
      });
    }
    const result = await Ability.roll(flavor, chance, modifier, speaker);
    await ItemCard.checkExperience(actor, item, result);
  }

  public static async checkExperience(
    actor: RqgActor,
    item: RqgItem,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success && !(item.data.data as any).hasExperience) {
      await actor.AwardExperience(item.id);
    }
  }

  private static async renderContent(flags: ItemCardFlags): Promise<object> {
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const item = await getRequiredDocumentFromUuid<RqgItem>(flags.card.itemUuid);

    const { itemChance, modifier } = await this.getFormDataFromFlags(flags);

    const templateData = {
      ...flags,
      chance: itemChance + modifier,
      cardHeading: localize("ITEM.Type" + item?.data.type.titleCase()) + ": " + item?.name,
    };

    let html = await renderTemplate("systems/rqg/chat/itemCard.hbs", templateData);

    return {
      user: getGame().user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
      content: html,
      whisper: usersThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  private static async getFormDataFromFlags(
    flags: ItemCardFlags
  ): Promise<{ modifier: number; itemChance: number }> {
    const item = await getDocumentFromUuid<RqgItem>(flags.card.itemUuid);

    if (!item || !("chance" in item.data.data) || item.data.data.chance == null) {
      const msg = localize("RQG.Item.Notification.ItemWithIdDoesNotHaveChanceError", {
        itemId: item?.id,
        actorName: item?.parent?.name,
      });
      throw new RqgError(msg, item);
    }

    const itemChance = item?.data.data.chance ?? 0;
    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return { itemChance: itemChance, modifier: modifier };
  }

  // Store the current raw string (FormDataEntryValue) form values to the flags
  private static updateFlagsFromForm(flags: ItemCardFlags, ev: Event): void {
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }
}
