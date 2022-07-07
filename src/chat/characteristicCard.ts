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
  usersIdsThatOwnActor,
} from "../system/util";
import {
  CharacteristicCardFlags,
  RqgChatMessageFlags,
} from "../data-model/shared/rqgDocumentFlags";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { RqgChatMessage } from "./RqgChatMessage";

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
      type: "characteristicCard",
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

  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "characteristicCard");
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });

    const { characteristicName, characteristicValue, difficulty, modifier } =
      await CharacteristicCard.getFormDataFromFlags(flags);
    await CharacteristicCard.roll(
      characteristicName,
      characteristicValue,
      difficulty,
      modifier,
      actor,
      speaker
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

  public static async renderContent(flags: RqgChatMessageFlags): Promise<object> {
    assertChatMessageFlagType(flags.type, "characteristicCard");
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
    assertChatMessageFlagType(flags.type, "characteristicCard");
    const characteristicName = flags.card.characteristic.name;
    const characteristicValue: number = Number(flags.card.characteristic.data.value) || 0;

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

  // Store the current raw string (FormDataEntryValue) form values to the flags
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "characteristicCard");
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
