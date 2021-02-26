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
    "0.5": string;
    "1": string;
    "2": string;
    "3": string;
    "4": string;
    "5": string;
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
        "0.5": "Nearly impossible (*0.5)",
        "1": "Very Hard (*1)",
        "2": "Hard (*2)",
        "3": "Moderate (*3)",
        "4": "Easy (*4)",
        "5": "Simple Action (*5)",
      },
    };

    await ChatMessage.create(await CharacteristicCard.renderContent(flags, actor));
  }

  public static inputChangeHandler(ev, messageId: string) {
    const chatMessage = game.messages.get(messageId);
    const flags: CharacteristicCardFlags = chatMessage.data.flags.rqg;
    const form: HTMLFormElement = ev.target.closest("form");
    const formData = new FormData(form);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    // TODO workaround for foundry removing option value...
    let difficulty = 1;
    for (const option in flags.difficultyOptions) {
      if (flags.difficultyOptions[option] === flags.formData.difficulty) {
        difficulty = Number(option);
      }
    }
    flags.formData.difficulty = difficulty;

    const characteristicValue: number = Number(flags.characteristic.data.value) || 0;
    const modifier: number = Number(flags.formData.modifier) || 0;
    const actor = (game.actors.get(flags.actorId) as unknown) as RqgActor;

    flags.formData.chance = CharacteristicCard.calcRollChance(
      characteristicValue,
      difficulty,
      modifier
    );
    CharacteristicCard.renderContent(flags, actor).then((d: Object) => chatMessage.update(d));
  }

  public static formSubmitHandler(ev, messageId: string) {
    ev.preventDefault();

    const chatMessage = game.messages.get(messageId);
    const flags: CharacteristicCardFlags = chatMessage.data.flags.rqg;

    const formData = new FormData(ev.target);
    // @ts-ignore
    for (const [name, value] of formData) {
      flags.formData[name] = value;
    }

    const button = ev.currentTarget;
    button.disabled = true;

    const characteristicValue: number = Number(flags.characteristic.data.value) || 0;
    const difficulty: number = Number(flags.formData.difficulty) || 1;
    const modifier: number = Number(flags.formData.modifier) || 0;
    const actor: RqgActor = (game.actors.get(flags.actorId) as unknown) as RqgActor;
    CharacteristicCard.roll(
      actor,
      flags.characteristic.name,
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
      ui.notifications.info("🎉 Yey, you got an experience check on power!");
    }
  }

  private static async renderContent(flags: CharacteristicCardFlags, actor: RqgActor) {
    let html = await renderTemplate("systems/rqg/chat/characteristicCard.html", flags);

    return {
      flavor: "Characteristic: " + flags.characteristic.name,
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

  private static calcRollChance(value: number, difficulty: number, modifier: number): number {
    return Math.ceil(value * difficulty + modifier);
  }
}
