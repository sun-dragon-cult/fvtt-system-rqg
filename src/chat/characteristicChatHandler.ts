import { Ability, ResultEnum } from "../data-model/shared/ability";
import { Characteristic } from "../data-model/actor-data/characteristics";
import { RqgActor } from "../actors/rqgActor";
import {
  activateChatTab,
  assertChatMessageFlagType,
  assertHtmlElement,
  cleanIntegerString,
  convertFormValueToInteger,
  formatModifier,
  getDocumentFromUuid,
  getGame,
  getRequiredRqgActorFromUuid,
  localize,
  localizeCharacteristic,
  usersIdsThatOwnActor,
} from "../system/util";
import {
  CharacteristicChatFlags,
  RqgChatMessageFlags,
} from "../data-model/shared/rqgDocumentFlags";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { RqgChatMessage } from "./RqgChatMessage";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

export type CharacteristicData = {
  name: string;
  data: Characteristic;
};

export class CharacteristicChatHandler {
  public static async show(
    characteristic: CharacteristicData,
    actor: RqgActor,
    token: TokenDocument | null | undefined
  ): Promise<void> {
    const flags: CharacteristicChatFlags = {
      type: "characteristicChat",
      chat: {
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

    await ChatMessage.create(await CharacteristicChatHandler.renderContent(flags));
    activateChatTab();
  }

  /**
   * Do a roll from the Characteristic Chat message. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.flags.rqg;
    assertChatMessageFlagType(flags?.type, "characteristicChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });

    const { characteristicName, characteristicValue, difficulty, modifier } =
      await CharacteristicChatHandler.getFormDataFromFlags(flags);
    await CharacteristicChatHandler.roll(
      characteristicName,
      characteristicValue,
      difficulty,
      modifier,
      actor,
      speaker
    );
  }

  public static async roll(
    characteristicName: string,
    characteristicValue: number | undefined,
    difficulty: number,
    modifier: number,
    actor: RqgActor,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    if (characteristicValue == null) {
      return;
    }

    const translationKeyDifficulty = difficulty === 0.5 ? 0 : difficulty;
    const localizedDifficulty = localize(`RQG.Game.RollDifficulty.${translationKeyDifficulty}`);
    let flavor = localize("RQG.Dialog.characteristicChat.RollFlavor", {
      difficulty: localizedDifficulty,
      name: localizeCharacteristic(characteristicName),
    });
    if (modifier !== 0) {
      const formattedModifier = formatModifier(modifier);
      flavor += localize("RQG.Dialog.characteristicChat.RollFlavorModifier", {
        modifier: formattedModifier,
      });
    }
    const result = await Ability.roll(flavor, characteristicValue * difficulty, modifier, speaker);
    await CharacteristicChatHandler.checkExperience(actor, characteristicName, result);
  }

  public static async checkExperience(
    actor: RqgActor,
    characteristicName: string,
    result: ResultEnum
  ): Promise<void> {
    if (
      result <= ResultEnum.Success &&
      characteristicName === "power" &&
      !actor.system.characteristics.power.hasExperience
    ) {
      await actor.update({ "system.characteristics.power.hasExperience": true });
      const msg = localize("RQG.Actor.AwardExperience.GainedExperienceInfo", {
        actorName: actor.name,
        itemName: localizeCharacteristic("power"),
      });
      ui.notifications?.info(msg);
    }
  }

  public static async renderContent(
    flags: RqgChatMessageFlags
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "characteristicChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);

    const { characteristicValue, difficulty, modifier } =
      await CharacteristicChatHandler.getFormDataFromFlags(flags);
    const chance = Math.ceil(characteristicValue * difficulty + modifier);

    const templateData = {
      ...flags,
      difficultyOptions: CharacteristicChatHandler.getDifficultyOptions(),
      chance: chance,
      chatHeading: localize("RQG.Dialog.characteristicChat.ChatFlavor", {
        name: localizeCharacteristic(flags.chat.characteristic.name),
        value: flags.chat.characteristic.data.value,
      }),
    };

    let html = await renderTemplate("systems/rqg/chat/characteristicChatHandler.hbs", templateData);
    return {
      user: getGame().user?.id,
      speaker: ChatMessage.getSpeaker({ actor: actor, token: token }),
      content: html,
      whisper: usersIdsThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  public static async getFormDataFromFlags(flags: RqgChatMessageFlags): Promise<{
    characteristicName: string;
    difficulty: number;
    modifier: number;
    characteristicValue: number;
  }> {
    assertChatMessageFlagType(flags.type, "characteristicChat");
    const characteristicName = flags.chat.characteristic.name;
    const characteristicValue: number = Number(flags.chat.characteristic.data.value) || 0;

    // The dropdown value is a (string) integer - let 0 be a stand in for 0.5 to make the corresponding translation key work.
    const difficulty =
      flags.formData.difficulty === "0" ? 0.5 : Number(flags.formData.difficulty) || 5;

    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return {
      characteristicName: characteristicName,
      characteristicValue: characteristicValue,
      difficulty: difficulty,
      modifier: modifier,
    };
  }

  /**
   * Store the current raw string (FormDataEntryValue) form values to the flags
   * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
   */
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "characteristicChat");
    const target = ev.target;
    assertHtmlElement(target);
    const form = target?.closest<HTMLFormElement>("form") ?? undefined;
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
