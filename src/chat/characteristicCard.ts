import { Ability, ResultEnum } from "../data-model/shared/ability";
import { RqgActor } from "../actors/rqgActor";
import { Characteristic } from "../data-model/actor-data/characteristics";

export type CharacteristicData = {
  name: string;
  data: Characteristic;
};

type CharacteristicCardFlags = {
  actorId: string;
  characteristic: CharacteristicData;
  formData: {
    difficulty: number;
    modifier: number;
    chance: number;
  };
  difficultyOptions: {
    // TODO generalise
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
};

export class CharacteristicCard {
  public static async show(actor: RqgActor, characteristic: CharacteristicData): Promise<void> {
    const defaultDifficulty = 5;
    const defaultModifier = 0;
    const flags: CharacteristicCardFlags = {
      actorId: actor.id,
      characteristic: characteristic,
      formData: {
        difficulty: defaultDifficulty,
        modifier: defaultModifier,
        chance: CharacteristicCard.calcRollChance(
          characteristic.data.value,
          defaultDifficulty,
          defaultModifier
        ),
      },
      difficultyOptions: {
        0: "Nearly impossible (*0.5)",
        1: "Very Hard (*1)",
        2: "Hard (*2)",
        3: "Moderate (*3)",
        4: "Easy (*4)",
        5: "Simple Action (*5)",
      },
    };

    await ChatMessage.create(await CharacteristicCard.renderContent(flags, actor));
  }

  public static async inputChangeHandler(ev, messageId: string): Promise<void> {
    const chatMessage = game.messages.get(messageId);
    const flags: CharacteristicCardFlags = chatMessage.data.flags.rqg;
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const [
      actor,
      characteristicValue,
      difficulty,
      modifier,
    ] = CharacteristicCard.getFormDataFromFlags(flags);

    flags.formData.chance = CharacteristicCard.calcRollChance(
      characteristicValue,
      difficulty,
      modifier
    );
    const data = await CharacteristicCard.renderContent(flags, actor);
    await chatMessage.update(data);
  }

  public static async formSubmitHandler(ev, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: CharacteristicCardFlags = chatMessage.data.flags.rqg;
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const form = ev.target;
    // Disable form until completed
    form.style.pointerEvents = "none";

    const [
      actor,
      characteristicValue,
      difficulty,
      modifier,
    ] = CharacteristicCard.getFormDataFromFlags(flags);

    await CharacteristicCard.roll(
      actor,
      flags.characteristic.name,
      characteristicValue,
      difficulty,
      modifier
    );

    // Enabling the form again after DsN animation is finished TODO doesn't wait
    form.style.pointerEvents = "auto";
    return false;
  }

  public static async roll(
    actor: RqgActor,
    characteristicName: string,
    characteristicValue: number,
    difficulty: number,
    modifier: number
  ): Promise<void> {
    const result = await Ability.roll(
      actor,
      characteristicValue * difficulty,
      modifier,
      characteristicName + " check"
    );
    await CharacteristicCard.checkExperience(actor, characteristicName, result);
  }

  public static async checkExperience(
    actor: RqgActor,
    characteristicName: string,
    result: ResultEnum
  ): Promise<void> {
    if (
      result <= ResultEnum.Success &&
      characteristicName === "power" &&
      !actor.data.data.characteristics.power.hasExperience
    ) {
      await actor.update({ "data.characteristics.power.hasExperience": true });
      ui.notifications.info("🎉 Yey, you got an experience check on power!");
    }
  }

  private static getFormDataFromFlags(flags): [RqgActor, number, number, number] {
    const characteristicValue: number = Number(flags.characteristic.data.value) || 0;
    const difficulty: number = Number(flags.formData.difficulty) || 5;
    const modifier: number = Number(flags.formData.modifier) || 0;
    const actor: RqgActor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    return [actor, characteristicValue, difficulty, modifier];
  }

  private static updateFlagsFromForm(flags, ev): void {
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    // TODO workaround for foundry removing option value...
    let difficulty = 0;
    for (const option in flags.difficultyOptions) {
      if (
        flags.difficultyOptions.hasOwnProperty(option) &&
        flags.difficultyOptions[option] === flags.formData.difficulty
      ) {
        difficulty = Number(option);
      }
    }
    // Super ugly I know...
    flags.formData.difficulty = difficulty ? difficulty : 0.5;
  }

  private static async renderContent(
    flags: CharacteristicCardFlags,
    actor: RqgActor
  ): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/characteristicCard.html", flags);
    let whisperRecipients = game.users.filter((u) => u.isGM && u.active);
    whisperRecipients.push(game.user._id);

    return {
      flavor:
        "Characteristic: " +
        flags.characteristic.name +
        " (" +
        flags.characteristic.data.value +
        ")",
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

  private static calcRollChance(value: number, difficulty: number, modifier: number): number {
    return Math.ceil(value * difficulty + modifier);
  }
}
