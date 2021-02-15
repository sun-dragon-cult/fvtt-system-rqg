import { Ability } from "../data-model/shared/ability";

export class Chat {
  private static cardData: any = { characteristic: {}, formData: {} };
  static init() {
    // Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);
    Hooks.on("renderChatLog", (app, html, data) => {
      Chat.addChatListeners(html);
    });
    Hooks.on("renderChatPopout", (app, html, data) => {
      Chat.addChatListeners(html);
    });
  }

  static addChatListeners(html) {
    html.on("submit", "form", Chat.formSubmitHandler);
    html.on("change", "input", Chat.inputChangeHandler);
  }

  private static formSubmitHandler(ev) {
    ev.preventDefault();

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      Chat.cardData.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true;

    const characteristicValue: number = Number(Chat.cardData.characteristic.data.value) || 0;
    const difficulty: number = Number(Chat.cardData.formData.difficulty) || 1;
    const modifier: number = Number(Chat.cardData.formData.modifier) || 0;

    Ability.roll(
      characteristicValue * difficulty,
      modifier,
      Chat.cardData.characteristic.name + " check"
    );
    button.disabled = false;
    return false;
  }

  private static inputChangeHandler(ev) {
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      Chat.cardData.formData[name] = value;
    }

    const characteristicValue: number = Number(Chat.cardData.characteristic.data.value) || 0;
    const difficulty: number = Number(Chat.cardData.formData.difficulty) || 1;
    const modifier: number = Number(Chat.cardData.formData.modifier) || 0;

    const buttonEl = form.querySelector("button");

    buttonEl.innerHTML = `Roll (${Chat.calcCharacteristicRollChance(
      characteristicValue,
      difficulty,
      modifier
    ).toString()}%)`;
  }

  private static calcCharacteristicRollChance(
    value: number,
    difficulty: number,
    modifier: number
  ): number {
    return value * difficulty + modifier;
  }

  static async showCharacteristicChatCard(characteristic: any) {
    Chat.cardData.characteristic = characteristic;
    Chat.cardData.formData = { difficulty: 5, modifier: 0 }; // TODO Not so nice init
    Chat.cardData.formData.chance = Chat.calcCharacteristicRollChance(
      Chat.cardData.characteristic.data.value,
      Chat.cardData.formData.difficulty,
      Chat.cardData.formData.modifier
    );
    let html = await renderTemplate("systems/rqg/chat/characteristicCard.html", Chat.cardData);

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
}
