import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { RqgItem } from "../items/rqgItem";
import { logBug } from "../system/util";

type ItemCardFlags = {
  actorId: string;
  itemData: Item.Data;
  result: ResultEnum | undefined;
  formData: {
    modifier: number;
    chance: number;
  };
};

export class ItemCard {
  public static async show(actor: RqgActor, itemId: string): Promise<void> {
    const defaultModifier = 0;
    const item = actor.getOwnedItem(itemId) as RqgItem;
    if ("chance" in item.data.data && item.data.data.chance != null) {
      const flags: ItemCardFlags = {
        actorId: actor.id,
        itemData: item.data,
        result: undefined,
        formData: {
          modifier: defaultModifier,
          chance: item.data.data.chance,
        },
      };
      await ChatMessage.create(await ItemCard.renderContent(flags, actor));
    } else {
      logBug(`Tried to show itemcard for item ${item.name} without chance`, item);
    }
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = game.messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as ItemCardFlags;
    const actor = game.actors?.get(flags.actorId) as RqgActor;
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

    const data = await ItemCard.renderContent(flags, actor);
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
    const actor = game.actors?.get(flags.actorId);
    await ItemCard.roll(actor as any, flags.itemData, modifier);

    button.disabled = false;
    return false;
  }

  public static async roll(actor: RqgActor, itemData: Item.Data, modifier: number): Promise<void> {
    const chance: number = Number(itemData.data.chance) || 0;
    const result = await Ability.roll(actor, chance, modifier, itemData.name + " check");
    await ItemCard.checkExperience(actor as any, itemData, result);
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

  private static async renderContent(flags: ItemCardFlags, actor: RqgActor): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/itemCard.html", flags);
    let whisperRecipients = game.users?.filter((u) => u.isGM && u.active) || [];
    whisperRecipients.push(game.user!);

    return {
      flavor: flags.itemData.type + ": " + flags.itemData.name,
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: html,
      whisper: whisperRecipients,
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
