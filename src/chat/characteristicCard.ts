import { Ability, ResultEnum } from "../data-model/shared/ability";
import { Characteristic } from "../data-model/actor-data/characteristics";
import { RqgActor } from "../actors/rqgActor";
import {
  activateChatTab,
  assertChatMessageFlagType,
  cleanIntegerString,
  convertFormValueToInteger,
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  localize,
  localizeCharacteristic,
  moveCursorToEnd,
  requireValue,
  usersThatOwnActor,
} from "../system/util";
import { CharacteristicCardFlags } from "../data-model/shared/rqgDocumentFlags";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export type CharacteristicData = {
  name: string;
  data: Characteristic;
};

export class CharacteristicCard {
  public static async show(
    characteristic: CharacteristicData,
    actor: RqgActor,
    token: TokenDocument | null | undefined
  ): Promise<void> {
    const flags: CharacteristicCardFlags = {
      type: "characteristic",
      card: {
        actorUuid: actor.uuid,
        tokenUuid: token?.uuid,
        chatImage: "", // TODO What img should a characteristic have?
        characteristic: characteristic,
      },
      formData: {
        difficulty: "5",
        modifier: "",
      },
    };

    await ChatMessage.create(await CharacteristicCard.renderContent(flags));
    activateChatTab();
  }

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));

    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "characteristic");
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const data = await CharacteristicCard.renderContent(flags);
    const domChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const domChatMessage = Array.from(domChatMessages).find((m) =>
      m.contains(ev.currentTarget as Node)
    );
    const isFromPopoutChat = !!domChatMessage?.closest(".chat-popout");
    await chatMessage.update(data); // Rerenders the dom chatmessages

    const newDomChatMessages = document.querySelectorAll<HTMLElement>(
      `[data-message-id="${chatMessage.id}"]`
    );
    const newDomChatMessage = Array.from(newDomChatMessages).find(
      (m) => !!m.closest(".chat-popout") === isFromPopoutChat
    );

    // Find the input element that inititated the change and move the cursor there.
    const inputElement = ev.target;
    if (inputElement instanceof HTMLInputElement && inputElement.type === "text") {
      const elementName = inputElement?.name;
      const newInputElement = newDomChatMessage?.querySelector<HTMLInputElement>(
        `[name=${elementName}]`
      );
      newInputElement && moveCursorToEnd(newInputElement);
    }
  }

  public static async formSubmitHandler(
    ev: JQueryEventObject,
    messageId: string
  ): Promise<boolean> {
    ev.preventDefault();

    const button = (ev.originalEvent as SubmitEvent).submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "characteristic");
    CharacteristicCard.updateFlagsFromForm(flags, ev);

    const form = ev.target as HTMLFormElement;
    // Disable form until completed
    form.style.pointerEvents = "none";

    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);

    const { characteristicValue, difficulty, modifier } =
      await CharacteristicCard.getFormDataFromFlags(flags);

    await CharacteristicCard.roll(
      flags.card.characteristic.name,
      characteristicValue,
      difficulty,
      modifier,
      actor,
      ChatMessage.getSpeaker({ actor: actor, token: token })
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
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    const translationKeyDifficulty = difficulty === 0.5 ? 0 : difficulty;
    const localizedDifficulty = localize(`RQG.Game.RollDifficulty.${translationKeyDifficulty}`);
    let flavor = localize("RQG.Dialog.characteristicCard.RollFlavor", {
      difficulty: localizedDifficulty,
      name: localizeCharacteristic(characteristicName),
    });
    if (modifier !== 0) {
      flavor += localize("RQG.Dialog.characteristicCard.RollFlavorModifier", {
        modifier: modifier,
      });
    }
    const result = await Ability.roll(flavor, characteristicValue * difficulty, modifier, speaker);
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
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: actor.name,
        itemName: localizeCharacteristic("power"),
      });
      ui.notifications?.info(msg);
    }
  }

  private static async renderContent(flags: CharacteristicCardFlags): Promise<object> {
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);

    const { characteristicValue, difficulty, modifier } =
      await CharacteristicCard.getFormDataFromFlags(flags);
    const chance = Math.ceil(characteristicValue * difficulty + modifier);

    const templateData = {
      ...flags,
      difficultyOptions: CharacteristicCard.getDifficultyOptions(),
      chance: chance,
      cardHeading: localize("RQG.Dialog.characteristicCard.CardFlavor", {
        name: localizeCharacteristic(flags.card.characteristic.name),
        value: flags.card.characteristic.data.value,
      }),
    };

    let html = await renderTemplate("systems/rqg/chat/characteristicCard.hbs", templateData);
    return {
      user: getGame().user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
      content: html,
      whisper: usersThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  private static async getFormDataFromFlags(
    flags: CharacteristicCardFlags
  ): Promise<{ difficulty: number; modifier: number; characteristicValue: number }> {
    const characteristicValue: number = Number(flags.card.characteristic.data.value) || 0;

    // The dropdown value is a (string) integer - let 0 be a stand in for 0.5 to make the corresponding translation key work.
    const difficulty =
      flags.formData.difficulty === "0" ? 0.5 : Number(flags.formData.difficulty) || 5;

    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return { characteristicValue: characteristicValue, difficulty: difficulty, modifier: modifier };
  }

  // Store the current raw string (FormDataEntryValue) form values to the flags
  private static updateFlagsFromForm(flags: CharacteristicCardFlags, ev: Event): void {
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);

    flags.formData.difficulty = formData.get("difficulty") ?? "";
    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }

  private static getDifficultyOptions() {
    return {
      0: localize("RQG.Game.RollDifficulty.0"),
      1: localize("RQG.Game.RollDifficulty.1"),
      2: localize("RQG.Game.RollDifficulty.2"),
      3: localize("RQG.Game.RollDifficulty.3"),
      4: localize("RQG.Game.RollDifficulty.4"),
      5: localize("RQG.Game.RollDifficulty.5"),
    };
  }
}
