import { Ability, ResultEnum } from "../data-model/shared/ability";
import {
  activateChatTab,
  assertChatMessageFlagType,
  assertItemType,
  cleanIntegerString,
  convertFormValueToInteger,
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  localize,
  moveCursorToEnd,
  requireValue,
  usersThatOwnActor,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { SpiritMagicCardFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export class SpiritMagicCard {
  public static async show(
    spiritMagicItemId: string,
    actor: RqgActor,
    token: TokenDocument | undefined
  ): Promise<void> {
    const spiritMagicItem = actor.items.get(spiritMagicItemId);
    assertItemType(spiritMagicItem?.data.type, ItemTypeEnum.SpiritMagic);

    const flags: SpiritMagicCardFlags = {
      type: "spiritMagic",
      card: {
        actorUuid: actor.uuid,
        tokenUuid: token?.uuid,
        chatImage: spiritMagicItem?.img ?? "",
        itemUuid: spiritMagicItem?.uuid,
      },
      formData: {
        level: spiritMagicItem.data.data.points.toString(),
        boost: "",
      },
    };

    await ChatMessage.create(await this.renderContent(flags));
    activateChatTab();
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));

    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "spiritMagic");
    SpiritMagicCard.updateFlagsFromForm(flags, ev);

    const data = await SpiritMagicCard.renderContent(flags);
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
    const flags = chatMessage?.data.flags.rqg as SpiritMagicCardFlags;
    assertChatMessageFlagType(flags.type, "spiritMagic");

    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const spiritMagicItem = await getRequiredDocumentFromUuid<RqgItem>(flags.card.itemUuid);
    const { level, boost } = await SpiritMagicCard.getFormDataFromFlags(flags);

    await SpiritMagicCard.roll(
      spiritMagicItem,
      level,
      boost,
      actor,
      ChatMessage.getSpeaker({ actor: actor, token: token })
    );

    return false;
  }

  public static async roll(
    spiritMagicItem: RqgItem,
    level: number,
    boost: number,
    actor: RqgActor,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    const validationError = SpiritMagicCard.validateData(actor, spiritMagicItem, level, boost);
    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const result = await Ability.roll(
        localize("RQG.Dialog.spiritMagicCard.Cast", { spellName: spiritMagicItem.name }),
        actor.data.data.characteristics.power.value * 5,
        0,
        speaker
      );
      await SpiritMagicCard.drawMagicPoints(actor, level + boost, result);
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
      return localize("RQG.Dialog.spiritMagicCard.CantCastSpellAboveLearnedLevel");
    } else if (level + boost > (actor.data.data.attributes.magicPoints.value || 0)) {
      return localize("RQG.Dialog.spiritMagicCard.NotEnoughMagicPoints");
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
        localize("RQG.Dialog.spiritMagicCard.SuccessfullyCastInfo", { amount: amount })
      );
    }
  }

  private static async renderContent(flags: SpiritMagicCardFlags): Promise<object> {
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const spiritMagicItem = await getRequiredDocumentFromUuid<RqgItem>(flags.card.itemUuid);
    const templateData = {
      ...flags,
      chance: actor.data.data.characteristics.power.value * 5,
      cardHeading: localize("RQG.Dialog.spiritMagicCard.CardFlavor", {
        name: spiritMagicItem?.name,
      }),
    };
    let html = await renderTemplate("systems/rqg/chat/spiritMagicCard.hbs", templateData);

    return {
      // flavor: localize("RQG.Dialog.spiritMagicCard.CardFlavor", { name: spiritMagicItem?.name }),
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
    flags: SpiritMagicCardFlags
  ): Promise<{ level: number; boost: number }> {
    const level = convertFormValueToInteger(flags.formData.level);
    const boost = convertFormValueToInteger(flags.formData.boost);
    return { level: level, boost: boost };
  }

  // Store the current raw string (FormDataEntryValue) form values to the flags
  private static updateFlagsFromForm(flags: SpiritMagicCardFlags, ev: Event): void {
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    flags.formData.level = cleanIntegerString(formData.get("level"));
    flags.formData.boost = cleanIntegerString(formData.get("boost"));
  }
}
