import { Ability, ResultEnum } from "../data-model/shared/ability";
import { Characteristic } from "../data-model/actor-data/characteristics";
import { RqgActor } from "../actors/rqgActor";
import { getActorFromIds, getSpeakerName, RqgError } from "../system/util";

export type CharacteristicData = {
  name: string;
  data: Characteristic;
};

type CharacteristicCardFlags = {
  actorId: string;
  tokenId?: string;
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
  public static async show(
    characteristic: CharacteristicData,
    actor: RqgActor,
    token: Token | null
  ): Promise<void> {
    const defaultDifficulty = 5;
    const defaultModifier = 0;
    const flags: CharacteristicCardFlags = {
      actorId: actor.id,
      tokenId: token?.id,
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

    // @ts-ignore 0.8 tabs
    ui.sidebar?.activateTab(ui.sidebar.tabs.chat.tabName); // Switch to chat to make sure the user doesn't miss the chat card
    await ChatMessage.create(await CharacteristicCard.renderContent(flags));
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = game.messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as CharacteristicCardFlags;
    if (!flags || !chatMessage) {
      const msg = "couldn't find chatmessage";
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const [actor, characteristicValue, difficulty, modifier] =
      CharacteristicCard.getFormDataFromFlags(flags);

    flags.formData.chance = CharacteristicCard.calcRollChance(
      characteristicValue,
      difficulty,
      modifier
    );
    const data = await CharacteristicCard.renderContent(flags);
    await chatMessage.update(data);
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    // @ts-ignore submitter
    const button = ev.originalEvent.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = game.messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as CharacteristicCardFlags;
    if (!flags || !chatMessage) {
      const msg = "couldn't find chatmessage";
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const form = ev.target as HTMLFormElement;
    // Disable form until completed
    form.style.pointerEvents = "none";

    const [actor, characteristicValue, difficulty, modifier] =
      CharacteristicCard.getFormDataFromFlags(flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    await CharacteristicCard.roll(
      flags.characteristic.name,
      characteristicValue,
      difficulty,
      modifier,
      actor,
      speakerName
    );

    // Enabling the form again after DsN animation is finished TODO doesn't wait
    form.style.pointerEvents = "auto";
    return false;
  }

  public static async roll(
    characteristicName: string,
    characteristicValue: number,
    difficulty: number,
    modifier: number,
    actor: RqgActor,
    speakerName: string
  ): Promise<void> {
    const result = await Ability.roll(
      characteristicName + " check",
      characteristicValue * difficulty,
      modifier,
      speakerName
    );
    await CharacteristicCard.checkExperience(actor, characteristicName, result);
  }

  public static async checkExperience(
    actor: RqgActor, // TODO Change to Token
    characteristicName: string,
    result: ResultEnum
  ): Promise<void> {
    if (
      result <= ResultEnum.Success &&
      characteristicName === "power" &&
      !actor.data.data.characteristics.power.hasExperience
    ) {
      await actor.update({ "data.characteristics.power.hasExperience": true });
      ui.notifications?.info("🎉 Yey, you got an experience check on power!");
    }
  }

  private static getFormDataFromFlags(
    flags: CharacteristicCardFlags
  ): [RqgActor, number, number, number] {
    const characteristicValue: number = Number(flags.characteristic.data.value) || 0;
    const difficulty: number = Number(flags.formData.difficulty) || 5;
    const modifier: number = Number(flags.formData.modifier) || 0;
    const actor = getActorFromIds(flags.actorId, flags.tokenId);
    return [actor, characteristicValue, difficulty, modifier];
  }

  private static updateFlagsFromForm(flags: CharacteristicCardFlags, ev: Event): void {
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);
    // @ts-ignore formData.entries()
    for (const [name, value] of formData.entries()) {
      if (name in flags.formData) {
        flags.formData[name as keyof typeof flags.formData] = value;
      }
    }

    // Using value 0 as a standin for 0.5
    if (Number(flags.formData.difficulty) === 0) {
      flags.formData.difficulty = 0.5;
    }
  }

  private static async renderContent(flags: CharacteristicCardFlags): Promise<object> {
    let html = await renderTemplate("systems/rqg/chat/characteristicCard.html", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor:
        "Characteristic: " +
        flags.characteristic.name +
        " (" +
        flags.characteristic.data.value +
        ")",
      user: game.user?.id,
      speaker: { alias: speakerName },
      content: html,
      whisper: game.users?.filter((u) => (u.isGM && u.active) || u.id === game.user?.id),
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
