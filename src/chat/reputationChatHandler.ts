import { RqgActor } from "../actors/rqgActor";
import { Ability } from "../data-model/shared/ability";
import {
  activateChatTab,
  assertActorType,
  assertChatMessageFlagType,
  assertHtmlElement,
  cleanIntegerString,
  convertFormValueToInteger,
  getDocumentFromUuid,
  getGame,
  getRequiredRqgActorFromUuid,
  localize,
  usersIdsThatOwnActor,
} from "../system/util";
import { systemId } from "../system/config";
import { ReputationChatFlags, RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";
import { RqgChatMessage } from "./RqgChatMessage";
import { ChatMessageDataConstructorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

export class ReputationChatHandler {
  public static async show(actor: RqgActor, token: TokenDocument | null): Promise<void> {
    const iconSettings = getGame().settings.get(systemId, "defaultItemIconSettings");

    const flags: ReputationChatFlags = {
      type: "reputationChat",
      chat: {
        actorUuid: actor.uuid,
        tokenUuid: token?.uuid,
        chatImage: iconSettings.Reputation,
      },
      formData: {
        modifier: "",
      },
    };
    await ChatMessage.create(await this.renderContent(flags));
    activateChatTab();
  }

  /**
   * Do a roll from the Reputation Chat message. Use the flags on the chatMessage to get the required data.
   * Called from {@link RqgChatMessage.doRoll}
   */
  public static async rollFromChat(chatMessage: RqgChatMessage): Promise<void> {
    const flags = chatMessage.flags.rqg;
    assertChatMessageFlagType(flags?.type, "reputationChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });

    const { reputationValue, modifier } = await ReputationChatHandler.getFormDataFromFlags(flags);
    await ReputationChatHandler.roll(reputationValue, modifier, speaker);
  }

  public static async roll(
    reputationValue: number,
    modifier: number,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    const flavor = localize("RQG.Dialog.reputationChat.CheckReputationFlavor");

    await Ability.roll(flavor, reputationValue, modifier, speaker);
    activateChatTab();
  }

  public static async renderContent(
    flags: RqgChatMessageFlags
  ): Promise<ChatMessageDataConstructorData> {
    assertChatMessageFlagType(flags.type, "reputationChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.chat.tokenUuid);
    const { reputationValue, modifier } = await ReputationChatHandler.getFormDataFromFlags(flags);

    const templateData = {
      ...flags,
      chance: reputationValue + modifier,
      chatHeading: localize("RQG.Dialog.reputationChat.Reputation"),
    };
    let html = await renderTemplate("systems/rqg/chat/reputationChatHandler.hbs", templateData);
    const speaker = ChatMessage.getSpeaker({ actor: actor, token: token });

    return {
      user: getGame().user?.id,
      speaker: speaker,
      content: html,
      whisper: usersIdsThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  public static async getFormDataFromFlags(
    flags: RqgChatMessageFlags
  ): Promise<{ modifier: number; reputationValue: number }> {
    assertChatMessageFlagType(flags.type, "reputationChat");
    const actor = await getRequiredRqgActorFromUuid<RqgActor>(flags.chat.actorUuid);
    assertActorType(actor?.type, ActorTypeEnum.Character);
    const reputationValue: number = Number(actor.system.background.reputation) || 0;

    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return { reputationValue: reputationValue, modifier: modifier };
  }

  /**
   * Store the current raw string (FormDataEntryValue) form values to the flags
   * Called from {@link RqgChatMessage.formSubmitHandler} and {@link RqgChatMessage.inputChangeHandler}
   */
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "reputationChat");
    const target = ev.target;
    assertHtmlElement(target);
    const form = target?.closest<HTMLFormElement>("form") ?? undefined;
    const formData = new FormData(form);
    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }
}
