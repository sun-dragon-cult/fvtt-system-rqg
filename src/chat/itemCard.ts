import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";

type ItemCardFlags = {
  actorId: string;
  itemData: ItemData;
  result: ResultEnum;
  formData: {
    modifier: number;
    chance: number;
  };
};

export class ItemCard {
  public static async show(actor: RqgActor, itemId: string): Promise<void> {
    const defaultModifier = 0;
    const item = actor.getOwnedItem(itemId);
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
  }

  public static inputChangeHandler(ev, messageId: string) {
    const chatMessage = game.messages.get(messageId);
    const flags: ItemCardFlags = chatMessage.data.flags.rqg;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const chance: number = Number(flags.itemData.data.chance) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;

    flags.formData.chance = ItemCard.calcRollChance(chance, modifier);
    ItemCard.renderContent(flags, actor).then((d: Object) => chatMessage.update(d));
  }

  public static formSubmitHandler(ev, messageId: string) {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: ItemCardFlags = chatMessage.data.flags.rqg;

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true;

    const modifier: number = Number(flags.formData.modifier) || 0;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    ItemCard.roll(actor, flags.itemData, modifier);

    button.disabled = false;
    return false;
  }

  public static roll(actor: RqgActor, itemData: ItemData, modifier: number) {
    const chance: number = Number(itemData.data.chance) || 0;
    const result = Ability.roll(chance, modifier, itemData.name + " check");
    ItemCard.checkExperience(actor, itemData, result);
  }

  public static checkExperience(actor: RqgActor, itemData: ItemData, result: ResultEnum): void {
    if (result <= ResultEnum.Success && !itemData.data.hasExperience) {
      // @ts-ignore
      actor.updateOwnedItem({ _id: itemData._id, data: { hasExperience: true } });
      ui.notifications.info("Yey, you got an experience check on " + itemData.name + "!");
    }
  }

  private static async renderContent(flags: ItemCardFlags, actor: RqgActor) {
    let html = await renderTemplate("systems/rqg/chat/itemCard.html", flags);

    return {
      flavor: flags.itemData.type + ": " + flags.itemData.name,
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      content: html,
      whisper: [game.user._id],
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
