import { ChatCard } from "./chatCards";
import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { RqgItem } from "../items/rqgItem";

export class SpiritMagicCard implements ChatCard {
  private cardData: any = { item: {}, formData: {} };
  private actor: RqgActor;

  public async show(actor: RqgActor, itemId: any): Promise<void> {
    this.actor = actor;
    this.cardData.item = this.actor.getOwnedItem(itemId);

    this.cardData.formData = {
      level: this.cardData.item.data.data.points,
      boost: 0,
      chance: this.actor.data.data.characteristics.power.value * 5,
    };

    let html = await renderTemplate("systems/rqg/chat/spiritMagicCard.html", this.cardData);

    const chatData = {
      title: "Spirit Magic",
      flavor: "",
      user: game.user._id,
      // speaker: ChatMessage.getSpeaker(), // TODO figure out what actor/token  is speaking
      content: html,
      whisper: [game.user._id],
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
      },
    };

    const chatMessage = await ChatMessage.create(chatData);
  }

  public inputChangeHandler(ev) {
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      this.cardData.formData[name] = value;
    }

    const buttonEl = form.querySelector("button");
    buttonEl.innerHTML = `Roll (${SpiritMagicCard.calcRollChance(
      this.actor.data.data.characteristics.power.value * 5,
      0
    ).toString()}%)`;
  }

  public formSubmitHandler(ev) {
    ev.preventDefault();

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      this.cardData.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true;

    const level: number = Number(this.cardData.formData.level) || 0;
    const boost: number = Number(this.cardData.formData.boost) || 0;
    SpiritMagicCard.roll(this.actor, this.cardData.item, level, boost);

    button.disabled = false;
    return false;
  }

  public static roll(actor: RqgActor, item: RqgItem, level: number, boost: number) {
    const validationError = SpiritMagicCard.validateData(actor, item, Number(level), Number(boost));

    if (validationError) {
      ui.notifications.warn(validationError);
    } else {
      const result = Ability.roll(
        actor.data.data.characteristics.power.value * 5,
        0,
        "Cast " + item.name
      );
      SpiritMagicCard.drawMagicPoints(actor, level + boost, result);
    }
  }

  public static validateData(actor: RqgActor, item: RqgItem, level: number, boost: number): string {
    if (level > item.data.data.points) {
      return "Can not cast spell above learned level";
    } else if (level + boost > actor.data.data.attributes.magicPoints.value) {
      return "Not enough magic points left";
    } else {
      return "";
    }
  }

  public static drawMagicPoints(actor: RqgActor, amount: number, result: ResultEnum): void {
    if (result <= ResultEnum.Success) {
      const newMp = actor.data.data.attributes.magicPoints.value - amount;
      actor.update({ "data.attributes.magicPoints.value": newMp });
      ui.notifications.info("Successfully cast the spell, drew " + amount + " magic points.");
    }
  }

  private static calcRollChance(value: number, modifier: number): number {
    return value + modifier;
  }
}
