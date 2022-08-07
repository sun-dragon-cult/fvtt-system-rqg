import { Ability, ResultEnum } from "../data-model/shared/ability";
import {
  assertChatMessageFlagType,
  assertItemType,
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
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { RqgChatMessage } from "./RqgChatMessage";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

export class SpiritMagicChatHandler {
  /**
   * Do a roll from the Spirit Magic Chat message. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "spiritMagicChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const spiritMagicItem = (await getRequiredDocumentFromUuid(flags.chat.itemUuid)) as RqgItem;
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });

    const { level, boost } = await SpiritMagicChatHandler.getFormDataFromFlags(flags);
    await SpiritMagicChatHandler.roll(spiritMagicItem, level, boost, actor, speaker);
  }

  public static async roll(
    spiritMagicItem: RqgItem,
    level: number,
    boost: number,
    actor: RqgActor,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    const validationError = SpiritMagicChatHandler.validateData(
      actor,
      spiritMagicItem,
      level,
      boost
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const result = await Ability.roll(
        localize("RQG.Dialog.spiritMagicChat.Cast", { spellName: spiritMagicItem.name }),
        actor.data.data.characteristics.power.value * 5,
        0,
        speaker
      );
      await SpiritMagicChatHandler.drawMagicPoints(actor, level + boost, result);
    }
  }

  public static validateData(
    actor: RqgActor,
    spiritMagicItem: RqgItem,
    level: number,
    boost: number
  ): string | undefined {
    assertItemType(spiritMagicItem.data.type, ItemTypeEnum.SpiritMagic);
    if (level > spiritMagicItem.data.data.points) {
      return localize("RQG.Dialog.spiritMagicChat.CantCastSpellAboveLearnedLevel");
    } else if (level + boost > (actor.data.data.attributes.magicPoints.value || 0)) {
      return localize("RQG.Dialog.spiritMagicChat.NotEnoughMagicPoints");
    } else {
      return;
    }
  }

  public static async drawMagicPoints(
    actor: RqgActor,
    amount: number,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success) {
      const newMp = (actor.data.data.attributes.magicPoints.value || 0) - amount;
      await actor.update({ "data.attributes.magicPoints.value": newMp });
      ui.notifications?.info(
        localize("RQG.Dialog.spiritMagicChat.SuccessfullyCastInfo", { amount: amount })
      );
    }
  }

  public static async renderContent(
    flags: RqgChatMessageFlags
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "spiritMagicChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const spiritMagicItem = await getRequiredDocumentFromUuid<RqgItem>(flags.chat.itemUuid);
    const templateData = {
      ...flags,
      chance: actor.data.data.characteristics.power.value * 5,
      chatHeading: localize("RQG.Dialog.spiritMagicChat.ChatFlavor", {
        name: spiritMagicItem?.name,
      }),
    };
    let html = await renderTemplate("systems/rqg/chat/spiritMagicChatHandler.hbs", templateData);

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
    flags: RqgChatMessageFlags
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
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    flags.formData.level = cleanIntegerString(formData.get("level"));
    flags.formData.boost = cleanIntegerString(formData.get("boost"));
  }
}
