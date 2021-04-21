import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { SpiritMagicData } from "../data-model/item-data/spiritMagicData";

type SpiritMagicCardFlags = {
  actorId: string;
  itemData: Item.Data<SpiritMagicData>;
  formData: {
    level: number;
    boost: number;
    chance: number;
  };
};

export class SpiritMagicCard {
  public static async show(actor: RqgActor, spiritMagicItemId: string): Promise<void> {
    const spiritMagicItemData = actor.getOwnedItem(spiritMagicItemId)
      ?.data as Item.Data<SpiritMagicData>;

    const flags: SpiritMagicCardFlags = {
      actorId: actor._id,
      itemData: spiritMagicItemData,
      formData: {
        level: spiritMagicItemData.data.points,
        boost: 0,
        chance: actor.data.data.characteristics.power.value * 5,
      },
    };

    await ChatMessage.create(await this.renderContent(flags, actor as any));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {}

  public static async formSubmitHandler(ev: Event, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const chatMessage = game.messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as SpiritMagicCardFlags;

    const formData = new FormData(ev.target as HTMLFormElement);
    // @ts-ignore formData.entries()
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    const button = ev.currentTarget as HTMLButtonElement;
    button.disabled = true;

    const level: number = Number(flags.formData.level) || 0;
    const boost: number = Number(flags.formData.boost) || 0;
    const actor = game.actors?.get(flags.actorId) as RqgActor;
    await SpiritMagicCard.roll(actor, flags.itemData, level, boost);

    button.disabled = false;
    return false;
  }

  public static async roll(
    actor: RqgActor,
    itemData: Item.Data<SpiritMagicData>,
    level: number,
    boost: number
  ): Promise<void> {
    const validationError = SpiritMagicCard.validateData(
      actor,
      itemData,
      Number(level),
      Number(boost)
    );

    if (validationError) {
      ui.notifications?.warn(validationError);
    } else {
      const result = await Ability.roll(
        actor,
        actor.data.data.characteristics.power.value * 5,
        0,
        "Cast " + itemData.name
      );
      await SpiritMagicCard.drawMagicPoints(actor as any, level + boost, result);
    }
  }

  public static validateData(
    actor: RqgActor,
    itemData: Item.Data<SpiritMagicData>,
    level: number,
    boost: number
  ): string {
    if (level > itemData.data.points) {
      return "Can not cast spell above learned level";
    } else if (level + boost > (actor.data.data.attributes.magicPoints.value || 0)) {
      return "Not enough magic points left";
    } else {
      return "";
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
      ui.notifications?.info("Successfully cast the spell, drew " + amount + " magic points.");
    }
  }

  private static async renderContent(
    flags: SpiritMagicCardFlags,
    actor: RqgActor
  ): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/spiritMagicCard.html", flags);

    return {
      flavor: "Spirit Magic: " + flags.itemData.name,
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      content: html,
      whisper: game.users?.filter((u) => (u.isGM && u.active) || u._id === game.user?._id),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }
}
