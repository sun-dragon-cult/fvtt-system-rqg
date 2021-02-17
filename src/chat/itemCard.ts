import { ChatCard } from "./chatCards";
import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { RqgItem } from "../items/rqgItem";

export class ItemCard implements ChatCard {
  private cardData: any = { item: {}, formData: {} };
  private actor: RqgActor;

  public async show(actor: RqgActor, itemId: any): Promise<void> {
    this.actor = actor;
    this.cardData.item = this.actor.getOwnedItem(itemId);

    this.cardData.formData = { modifier: 0 };
    this.cardData.formData.chance = ItemCard.calcRollChance(
      this.cardData.item.data.data.chance,
      this.cardData.formData.modifier
    );
    let html = await renderTemplate("systems/rqg/chat/itemCard.html", this.cardData);

    const chatData = {
      title: "Ability check",
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

    const chance: number = Number(this.cardData.item.data.data.chance) || 0;
    const modifier: number = Number(this.cardData.formData.modifier) || 0;

    const buttonEl = form.querySelector("button");

    buttonEl.innerHTML = `Roll (${ItemCard.calcRollChance(chance, modifier).toString()}%)`;
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

    const modifier: number = Number(this.cardData.formData.modifier) || 0;
    ItemCard.roll(this.actor, this.cardData.item, modifier);

    button.disabled = false;
    return false;
  }

  public static roll(actor: RqgActor, item: RqgItem, modifier: number) {
    const chance: number = Number(item.data.data.chance) || 0;
    const result = Ability.roll(chance, modifier, item.name + " check");
    ItemCard.checkExperience(actor, item, result);
  }

  public static checkExperience(actor: RqgActor, item: RqgItem, result: ResultEnum): void {
    if (result <= ResultEnum.Success && !item.data.data.hasExperience) {
      actor.updateOwnedItem({ _id: item._id, data: { hasExperience: true } });
      ui.notifications.info("Yey, you got an experience check on " + item.name + "!");
    }
  }

  private static calcRollChance(value: number, modifier: number): number {
    return value + modifier;
  }
}
