import { ChatCard } from "./chatCards";
import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";

export class CharacteristicCard implements ChatCard {
  private cardData: any = { characteristic: {}, formData: {} };
  private actor: RqgActor;

  public async show(actor: RqgActor, characteristic: any): Promise<void> {
    this.actor = actor;
    this.cardData.characteristic = characteristic;
    this.cardData.formData = { difficulty: 5, modifier: 0 }; // TODO Not so nice init
    this.cardData.formData.chance = CharacteristicCard.calcRollChance(
      this.cardData.characteristic.data.value,
      this.cardData.formData.difficulty,
      this.cardData.formData.modifier
    );
    let html = await renderTemplate("systems/rqg/chat/characteristicCard.html", this.cardData);

    const chatData = {
      title: "Characteristic check",
      flavor: characteristic.name,
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

    const characteristicValue: number = Number(this.cardData.characteristic.data.value) || 0;
    const difficulty: number = Number(this.cardData.formData.difficulty) || 1;
    const modifier: number = Number(this.cardData.formData.modifier) || 0;

    const buttonEl = form.querySelector("button");

    buttonEl.innerHTML = `Roll (${CharacteristicCard.calcRollChance(
      characteristicValue,
      difficulty,
      modifier
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

    const characteristicValue: number = Number(this.cardData.characteristic.data.value) || 0;
    const difficulty: number = Number(this.cardData.formData.difficulty) || 1;
    const modifier: number = Number(this.cardData.formData.modifier) || 0;
    CharacteristicCard.roll(
      this.actor,
      this.cardData.characteristic.name,
      characteristicValue,
      difficulty,
      modifier
    );
    button.disabled = false;
    return false;
  }

  public static roll(
    actor: RqgActor,
    characteristicName: string,
    characteristicValue: number,
    difficulty: number,
    modifier: number
  ) {
    const result = Ability.roll(
      characteristicValue * difficulty,
      modifier,
      characteristicName + " check"
    );
    CharacteristicCard.checkExperience(actor, characteristicName, result);
  }

  public static checkExperience(
    actor: RqgActor,
    characteristicName: string,
    result: ResultEnum
  ): void {
    if (
      result <= ResultEnum.Success &&
      characteristicName === "power" &&
      !actor.data.data.characteristics.power.hasExperience
    ) {
      actor.update({ "data.characteristics.power.hasExperience": true });
      ui.notifications.info("Yey, you got an experience check on power!");
    }
  }

  private static calcRollChance(value: number, difficulty: number, modifier: number): number {
    return value * difficulty + modifier;
  }
}
