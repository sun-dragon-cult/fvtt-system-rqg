import { Ability, ResultEnum } from "../data-model/shared/ability";
import {
  activateChatTab,
  formatModifier,
  getGame,
  localize,
  RqgError,
  usersIdsThatOwnActor,
  assertChatMessageFlagType,
  getDocumentFromUuid,
  getRequiredDocumentFromUuid,
  convertFormValueToInteger,
  cleanIntegerString,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import {
  ChatSpeakerData,
  ChatSpeakerDataProperties,
} from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { ItemCardFlags, RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { RqgItem } from "../items/rqgItem";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

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
      type: "itemCard",
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

  public static async formSubmitHandler(ev: SubmitEvent, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const button = ev.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "itemCard");
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

  public static async renderContent(
    flags: RqgChatMessageFlags
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "itemCard");
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
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token }) as ChatSpeakerData;

    return {
      user: getGame().user?.id ?? null,
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
    flags: RqgChatMessageFlags
  ): Promise<{ modifier: number; itemChance: number }> {
    assertChatMessageFlagType(flags.type, "itemCard");
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
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "itemCard");
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }
}
