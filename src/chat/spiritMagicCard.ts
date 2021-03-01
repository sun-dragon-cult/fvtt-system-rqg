import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { SpiritMagicData } from "../data-model/item-data/spiritMagicData";

type SpiritMagicCardFlags = {
  actorId: string;
  itemData: ItemData;
  formData: {
    level: number;
    boost: number;
    chance: number;
  };
};

export class SpiritMagicCard {
  public static async show(actor: RqgActor, spiritMagicItemId: string): Promise<void> {
    const spiritMagicItemData: ItemData<SpiritMagicData> = actor.getOwnedItem(spiritMagicItemId)
      .data;

    const flags: SpiritMagicCardFlags = {
      actorId: actor._id,
      itemData: spiritMagicItemData,
      formData: {
        level: spiritMagicItemData.data.points,
        boost: 0,
        chance: actor.data.data.characteristics.power.value * 5,
      },
    };

    await ChatMessage.create(await this.renderContent(flags, actor));
  }

  public static async inputChangeHandler(ev, messageId: string) {}

  public static async formSubmitHandler(ev, messageId: string) {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: SpiritMagicCardFlags = chatMessage.data.flags.rqg;

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true;

    const level: number = Number(flags.formData.level) || 0;
    const boost: number = Number(flags.formData.boost) || 0;
    const actor: RqgActor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    await SpiritMagicCard.roll(actor, flags.itemData, level, boost);

    button.disabled = false;
    return false;
  }

  public static async roll(
    actor: RqgActor,
    itemData: ItemData<SpiritMagicData>,
    level: number,
    boost: number
  ) {
    const validationError = SpiritMagicCard.validateData(
      actor,
      itemData,
      Number(level),
      Number(boost)
    );

    if (validationError) {
      ui.notifications.warn(validationError);
    } else {
      const result = await Ability.roll(
        actor,
        actor.data.data.characteristics.power.value * 5,
        0,
        "Cast " + itemData.name
      );
      await SpiritMagicCard.drawMagicPoints(actor, level + boost, result);
    }
  }

  public static validateData(
    actor: RqgActor,
    itemData: ItemData<SpiritMagicData>,
    level: number,
    boost: number
  ): string {
    if (level > itemData.data.points) {
      return "Can not cast spell above learned level";
    } else if (level + boost > actor.data.data.attributes.magicPoints.value) {
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
      const newMp = actor.data.data.attributes.magicPoints.value - amount;
      await actor.update({ "data.attributes.magicPoints.value": newMp });
      ui.notifications.info("Successfully cast the spell, drew " + amount + " magic points.");
    }
  }

  private static async renderContent(flags: SpiritMagicCardFlags, actor: RqgActor) {
    let html = await renderTemplate("systems/rqg/chat/spiritMagicCard.html", flags);
    let whisperRecipients = game.users.filter((u) => u.isGM && u.active);
    whisperRecipients.push(game.user._id);

    return {
      flavor: "Spirit Magic: " + flags.itemData.name,
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({ actor: actor as any }),
      content: html,
      whisper: whisperRecipients,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }
}
