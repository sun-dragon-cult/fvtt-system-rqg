import {
  assertChatMessageFlagType,
  assertHtmlElement,
  cleanIntegerString,
  convertFormValueToInteger,
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  getRequiredRqgActorFromUuid,
  localize,
  usersIdsThatOwnActor,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";
import { RqgChatMessage } from "./RqgChatMessage";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";
import { templatePaths } from "../system/loadHandlebarsTemplates";

export class SpiritMagicChatHandler {
  /**
   * Do a roll from the Spirit Magic Chat message. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.flags.rqg;
    assertChatMessageFlagType(flags?.type, "spiritMagicChat");
    const spiritMagicItem = (await getRequiredDocumentFromUuid(flags.chat.itemUuid)) as RqgItem;
    const { level, boost } = await SpiritMagicChatHandler.getFormDataFromFlags(flags);

    await spiritMagicItem.abilityRoll({ level, boost });
  }

  public static async renderContent(
    flags: RqgChatMessageFlags,
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "spiritMagicChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const spiritMagicItem = await getRequiredDocumentFromUuid<RqgItem>(flags.chat.itemUuid);
    const templateData = {
      ...flags,
      chance: (actor.system.characteristics.power.value ?? 0) * 5,
      chatHeading: localize("RQG.Dialog.spiritMagicChat.ChatFlavor", {
        name: spiritMagicItem?.name,
      }),
    };
    const html = await renderTemplate(templatePaths.chatSpiritMagicHandler, templateData);

    return {
      user: getGame().user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
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
  ): Promise<{ level: number; boost: number }> {
    assertChatMessageFlagType(flags.type, "spiritMagicChat");
    const level = convertFormValueToInteger(flags.formData.level);
    const boost = convertFormValueToInteger(flags.formData.boost);
    return { level: level, boost: boost };
  }

  /**
   * Store the current raw string (FormDataEntryValue) form values to the flags
   * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
   */
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "spiritMagicChat");
    const target = ev.target;
    assertHtmlElement(target);
    const form = target?.closest<HTMLFormElement>("form") ?? undefined;
    const formData = new FormData(form);

    flags.formData.level = cleanIntegerString(formData.get("level"));
    flags.formData.boost = cleanIntegerString(formData.get("boost"));
  }
}
