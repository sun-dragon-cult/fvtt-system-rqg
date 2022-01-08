import { Ability, ResultEnum } from "../data-model/shared/ability";
import {
  activateChatTab,
  getActorFromIds,
  getGame,
  getSpeakerName,
  hasOwnProperty,
  moveCursorToEnd,
  requireValue,
  RqgError,
  usersThatOwnActor,
} from "../system/util";
import { RqgActor } from "../actors/rqgActor";
import { ItemDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData";

type ItemCardFlags = {
  actorId: string;
  tokenId: string | null;
  itemData: ItemDataProperties;
  result: ResultEnum | undefined;
  formData: {
    modifier: number;
    chance: number;
  };
};

export class ItemCard {
  public static async show(
    itemId: string,
    actor: RqgActor,
    token: TokenDocument | null
  ): Promise<void> {
    token && requireValue(token.id, "No id on token");
    requireValue(actor.id, "No id on actor");
    const defaultModifier = 0;
    const item = actor.items.get(itemId);
    if (!item || !("chance" in item.data.data) || item.data.data.chance == null) {
      const msg = `Couldn't find item with chance and itemId [${itemId}] on actor ${actor.name} to show item chat card.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    const flags: ItemCardFlags = {
      actorId: actor.id,
      tokenId: token?.id ?? null,
      // Need false to get derived chance TODO type of toObject(false) ??
      itemData: item.data.toObject(false) as unknown as ItemDataProperties,
      result: undefined,
      formData: {
        modifier: defaultModifier,
        chance: item.data.data.chance,
      },
    };
    flags.itemData.data;

    await ChatMessage.create(await ItemCard.renderContent(flags));
    activateChatTab(); 
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as ItemCardFlags;
    const form = (ev.target as HTMLElement).closest("form") as HTMLFormElement;
    const formData = new FormData(form);
    // @ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    const chance: number =
      (hasOwnProperty(flags.itemData.data, "chance") && Number(flags.itemData.data.chance)) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;
    flags.formData.chance = ItemCard.calcRollChance(chance, modifier);

    const data = await ItemCard.renderContent(flags);
    if (!chatMessage || !data || !flags.formData.modifier) {
      return; // Not ready to update chatmessages
    }
    const domChatMessages = document.querySelectorAll(`[data-message-id="${chatMessage.id}"]`);
    const domChatMessage = Array.from(domChatMessages).find((m) =>
      m.contains(ev.currentTarget as Node)
    );
    const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");

    await chatMessage.update(data);
    const newDomChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const newDomChatMessage = Array.from(newDomChatMessages).find(
      (m) => !!m.closest<HTMLElement>(".chat-popout") === isFromPopoutChat
    );
    const inputElement = newDomChatMessage?.querySelector("input");
    inputElement && moveCursorToEnd(inputElement);
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();
    // @ts-ignore submitter
    const button = ev.originalEvent.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as ItemCardFlags;
    const formData = new FormData(ev.target as HTMLFormElement);
    // @ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    const modifier = Number(flags.formData.modifier) || 0;
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    if (actor) {
      const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
      await ItemCard.roll(flags.itemData, modifier, actor, speakerName);
    } else {
      ui.notifications?.warn("Could not find world actor to do ability roll");
    }
    return false;
  }

  public static async roll(
    itemData: ItemDataProperties,
    modifier: number,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
    // @ts-ignore TODO handle chance
    const chance: number = Number(itemData.data.chance) || 0;
    const result = await Ability.roll(itemData.name + " check", chance, modifier, speakerName);
    await ItemCard.checkExperience(actor, itemData, result);
  }

  public static async checkExperience(
    actor: RqgActor,
    itemData: any,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success && !itemData.data.hasExperience) {
      await actor.updateEmbeddedDocuments("Item", [
        { _id: itemData._id, data: { hasExperience: true } },
      ]);
      ui.notifications?.info("Yey, you got an experience check on " + itemData.name + "!");
    }
  }

  private static async renderContent(flags: ItemCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/itemCard.hbs", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: flags.itemData.type + ": " + flags.itemData.name,
      user: getGame().user?.id,
      speaker: { alias: speakerName },
      content: html,
      whisper: usersThatOwnActor(getActorFromIds(flags.actorId, flags.tokenId)),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  private static calcRollChance(value: number, modifier: number): number {
    return value + modifier;
  }
}
