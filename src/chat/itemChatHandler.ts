import {
  getGame,
  localize,
  RqgError,
  usersIdsThatOwnActor,
  assertChatMessageFlagType,
  getDocumentFromUuid,
  getRequiredDocumentFromUuid,
  convertFormValueToInteger,
  cleanIntegerString,
  requireValue,
  getRequiredRqgActorFromUuid,
  localizeItemType,
  assertHtmlElement,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { RqgChatMessage } from "./RqgChatMessage";

export class ItemChatHandler {
  /**
   * Do a roll from the Item Chat message. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.flags.rqg;
    assertChatMessageFlagType(flags?.type, "itemChat");
    const item = (await getRequiredDocumentFromUuid(flags.chat.itemUuid)) as RqgItem | undefined;
    requireValue(item, "Couldn't find item on item chat message");
    const { modifier } = await ItemChatHandler.getFormDataFromFlags(flags);

    await item.abilityRoll({ modifier: modifier });
  }

  public static async renderContent(
    flags: RqgChatMessageFlags,
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "itemChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const item = await getRequiredDocumentFromUuid<RqgItem>(flags.chat.itemUuid);

    const { itemChance, modifier } = await this.getFormDataFromFlags(flags);

    const templateData = {
      ...flags,
      chance: itemChance + modifier,
      chatHeading: localizeItemType(item?.type) + ": " + item?.name,
    };

    const html = await renderTemplate("systems/rqg/chat/itemChatHandler.hbs", templateData);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });

    return {
      user: getGame().user?.id,
      speaker: speaker,
      content: html,
      whisper: usersIdsThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  public static async getFormDataFromFlags(
    flags: RqgChatMessageFlags,
  ): Promise<{ modifier: number; itemChance: number }> {
    assertChatMessageFlagType(flags.type, "itemChat");
    const item = await getDocumentFromUuid<RqgItem>(flags.chat.itemUuid);

    if (!item || !("chance" in item.system) || item.system.chance == null) {
      const msg = localize("RQG.Item.Notification.ItemWithIdDoesNotHaveChanceError", {
        itemId: item?.id,
        actorName: item?.parent?.name,
      });
      throw new RqgError(msg, item);
    }

    const itemChance = item?.system.chance ?? 0;
    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return { itemChance: itemChance, modifier: modifier };
  }

  /**
   * Store the current raw string (FormDataEntryValue) form values to the flags
   * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
   */
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "itemChat");
    const target = ev.target;
    assertHtmlElement(target);
    const form = target?.closest<HTMLFormElement>("form") ?? undefined;
    const formData = new FormData(form);

    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }
}
