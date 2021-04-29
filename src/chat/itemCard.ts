import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgItem } from "../items/rqgItem";
import { getActorFromIds, RqgError } from "../system/util";
import { RqgActor } from "../actors/rqgActor";

type ItemCardFlags = {
  actorId: string;
  tokenId?: string;
  itemData: Item.Data;
  result: ResultEnum | undefined;
  formData: {
    modifier: number;
    chance: number;
  };
};

export class ItemCard {
  public static async show(itemId: string, actor: RqgActor): Promise<void> {
    const defaultModifier = 0;
    const item = actor.getOwnedItem(itemId) as RqgItem;

    if (!("chance" in item.data.data) || item.data.data.chance == null) {
      const msg = `Tried to show itemcard for item ${item.name} without chance`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item, actor);
    }
    const flags: ItemCardFlags = {
      actorId: actor.id,
      tokenId: actor.token?.id,
      itemData: item.data,
      result: undefined,
      formData: {
        modifier: defaultModifier,
        chance: item.data.data.chance,
      },
    };
    await ChatMessage.create(await ItemCard.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = game.messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as ItemCardFlags;
    const form = (ev.target as HTMLElement).closest("form") as HTMLFormElement;
    const formData = new FormData(form);
    // @ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    const chance: number = Number(flags.itemData.data.chance) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;
    flags.formData.chance = ItemCard.calcRollChance(chance, modifier);

    const data = await ItemCard.renderContent(flags);
    if (chatMessage && data) {
      await chatMessage.update(data);
    }
  }

  public static async formSubmitHandler(ev: Event, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const chatMessage = game.messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as ItemCardFlags;

    const formData = new FormData(ev.target as HTMLFormElement);
    // @ts-ignore formData.entries
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    const button = ev.currentTarget as HTMLButtonElement;
    button.disabled = true;

    const modifier = Number(flags.formData.modifier) || 0;

    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    await ItemCard.roll(flags.itemData, modifier, actor);

    button.disabled = false;
    return false;
  }

  public static async roll(itemData: Item.Data, modifier: number, actor: RqgActor): Promise<void> {
    const chance: number = Number(itemData.data.chance) || 0;
    const result = await Ability.roll(actor, chance, modifier, itemData.name + " check");
    await ItemCard.checkExperience(actor, itemData, result);
  }

  public static async checkExperience(
    actor: RqgActor,
    itemData: Item.Data,
    result: ResultEnum
  ): Promise<void> {
    if (result <= ResultEnum.Success && !itemData.data.hasExperience) {
      await actor.updateOwnedItem({ _id: itemData._id, data: { hasExperience: true } });
      ui.notifications?.info("Yey, you got an experience check on " + itemData.name + "!");
    }
  }

  private static async renderContent(flags: ItemCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/itemCard.html", flags);
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    return {
      flavor: flags.itemData.type + ": " + flags.itemData.name,
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: html,
      whisper: game.users?.filter((u) => (u.isGM && u.active) || u._id === game.user?._id),
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
