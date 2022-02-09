import { Ability, ResultEnum } from "../data-model/shared/ability";
import { Characteristic } from "../data-model/actor-data/characteristics";
import { RqgActor } from "../actors/rqgActor";
import {
  activateChatTab,
  getActorFromIds,
  getGame,
  getSpeakerName,
  localize,
  localizeCharacteristic,
  moveCursorToEnd,
  requireValue,
  RqgError,
  usersThatOwnActor,
} from "../system/util";

export type CharacteristicData = {
  name: string;
  data: Characteristic;
};

type CharacteristicCardFlags = {
  actorId: string | null;
  tokenId: string | null;
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
    token: TokenDocument | null | undefined
  ): Promise<void> {
    requireValue(actor.id, localize("RQG.Dialog.characteristicCard.CardWithoutActorIdError"));
    const defaultDifficulty = 5;
    const defaultModifier = 0;
    const flags: CharacteristicCardFlags = {
      actorId: actor.id,
      tokenId: token?.id ?? null,
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
      difficultyOptions: CharacteristicCard.getDifficultyOptions(),
    };
    
    await ChatMessage.create(await CharacteristicCard.renderContent(flags));
    activateChatTab(); 
  }

  private static getDifficultyOptions(){
    return {
      0: localize("RQG.Game.RollDifficulty.0"),
      1: localize("RQG.Game.RollDifficulty.1"),
      2: localize("RQG.Game.RollDifficulty.2"),
      3: localize("RQG.Game.RollDifficulty.3"),
      4: localize("RQG.Game.RollDifficulty.4"),
      5: localize("RQG.Game.RollDifficulty.5"),
    }
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as CharacteristicCardFlags;
    if (!flags || !chatMessage) {
      const msg = localize("RQG.Dialog.Common.CantFindChatMessageError");
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
    if (!chatMessage || !data || !flags.formData.modifier) {
      return; // Not ready to update chatmessages
    }
    const domChatMessages = document.querySelectorAll(`[data-message-id="${chatMessage.id}"]`);
    const domChatMessage = Array.from(domChatMessages).find((m) =>
      m.contains(ev.currentTarget as Node)
    );
    const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");
    await chatMessage.update(data); // Rerenders the dom chatmessages

    const newDomChatMessages = document.querySelectorAll(`[data-message-id="${chatMessage.id}"]`);
    const newDomChatMessage = Array.from(newDomChatMessages).find(
      (m) => !!m.closest(".chat-popout") === isFromPopoutChat
    );
    const inputElement = newDomChatMessage?.querySelector("input");
    inputElement && moveCursorToEnd(inputElement);
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

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg as CharacteristicCardFlags;
    if (!flags || !chatMessage) {
      const msg = localize("RQG.Dialog.Common.CantFindChatMessageError");
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const form = ev.target as HTMLFormElement;
    // Disable form until completed
    form.style.pointerEvents = "none";

    const [actor, characteristicValue, difficulty, modifier] =
      CharacteristicCard.getFormDataFromFlags(flags);
    if (actor) {
      const speakerName = getSpeakerName(flags.actorId, flags.tokenId ?? null);
      await CharacteristicCard.roll(
        flags.characteristic.name,
        characteristicValue,
        difficulty,
        modifier,
        actor,
        speakerName
      );
    } else {
      ui.notifications?.warn(localize("RQG.Dialog.Common.CantFindActorToDoRollFromChatCardWarn"));
    }

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
    let tempDifficulty = difficulty;
    if (difficulty === 0.5) {
      tempDifficulty = 0;
    }
    const localizedDifficulty = localize(`RQG.Game.RollDifficulty.${tempDifficulty}`);
    let flavor = localize("RQG.Dialog.characteristicCard.RollFlavor", {difficulty: localizedDifficulty, name: localizeCharacteristic(characteristicName)});
    if (modifier !== 0) {
      flavor += localize("RQG.Dialog.characteristicCard.RollFlavorModifier", {modifier: modifier});
    }
    const result = await Ability.roll(
      flavor,
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
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: actor.name,
        itemName: localizeCharacteristic("power"),
      });
      ui.notifications?.info(msg);
    }
  }

  private static getFormDataFromFlags(
    flags: CharacteristicCardFlags
  ): [RqgActor | null, number, number, number] {
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
    let html = await renderTemplate("systems/rqg/chat/characteristicCard.hbs", flags);
    const speakerName = getSpeakerName(flags.actorId, flags.tokenId);
    return {
      flavor: localize("RQG.Dialog.characteristicCard.CardFlavor", {name: localizeCharacteristic(flags.characteristic.name), value: flags.characteristic.data.value}),
      user: getGame().user?.id,
      speaker: { alias: speakerName },
      content: html,
      whisper: usersThatOwnActor(getActorFromIds(flags.actorId, flags.tokenId)),
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
