import { RqgActor } from "../actors/rqgActor";
import { Ability } from "../data-model/shared/ability";
import {
  activateChatTab,
  assertActorType,
  assertChatMessageFlagType,
  cleanIntegerString,
  convertFormValueToInteger,
  getDocumentFromUuid,
  getGame,
  getRequiredDocumentFromUuid,
  localize,
  usersIdsThatOwnActor,
} from "../system/util";
import { ReputationCardFlags, RqgChatMessageFlags } from "../data-model/shared/rqgDocumentFlags";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export class ReputationCard {
  public static async show(actor: RqgActor, token: TokenDocument | null): Promise<void> {
    const iconSettings = getGame().settings.get("rqg", "defaultItemIconSettings");

    const flags: ReputationCardFlags = {
      type: "reputationCard",
      card: {
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

  public static async formSubmitHandler(ev: SubmitEvent, messageId: string): Promise<boolean> {
    ev.preventDefault();

    const button = ev.submitter as HTMLButtonElement;
    button.disabled = true;
    setTimeout(() => (button.disabled = false), 1000); // Prevent double clicks

    const chatMessage = getGame().messages?.get(messageId);
    const flags = chatMessage?.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "reputationCard");
    ReputationCard.updateFlagsFromForm(flags, ev);

    const form = ev.target as HTMLFormElement;
    // Disable form until completed
    form.style.pointerEvents = "none";
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const { reputationValue, modifier } = await ReputationCard.getFormDataFromFlags(flags);

    await ReputationCard.roll(
      reputationValue,
      modifier,
      ChatMessage.getSpeaker({ actor: actor, token: token })
    );
    // Enabling the form again after DsN animation is finished TODO doesn't wait
    form.style.pointerEvents = "auto";
    return false;
  }

  public static async roll(
    reputationValue: number,
    modifier: number,
    speaker: ChatSpeakerDataProperties
  ): Promise<void> {
    const flavor = localize("RQG.Dialog.reputationCard.CheckReputationFlavor");

    await Ability.roll(flavor, reputationValue, modifier, speaker);
    activateChatTab();
  }

  public static async renderContent(flags: RqgChatMessageFlags): Promise<object> {
    assertChatMessageFlagType(flags.type, "reputationCard");
    const actor = await getRequiredDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    const token = await getDocumentFromUuid<TokenDocument>(flags.card.tokenUuid);
    const { reputationValue, modifier } = await ReputationCard.getFormDataFromFlags(flags);

    const templateData = {
      ...flags,
      chance: reputationValue + modifier,
      cardHeading: localize("RQG.Dialog.reputationCard.Reputation"),
    };
    let html = await renderTemplate("systems/rqg/chat/reputationCard.hbs", templateData);
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

  public static async getFormDataFromFlags(
    flags: RqgChatMessageFlags
  ): Promise<{ modifier: number; reputationValue: number }> {
    assertChatMessageFlagType(flags.type, "reputationCard");
    const actor = await getDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    assertActorType(actor?.data.type, ActorTypeEnum.Character);
    const reputationValue: number = Number(actor.data.data.background.reputation) || 0;

    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return { reputationValue: reputationValue, modifier: modifier };
  }

  // Store the current raw string (FormDataEntryValue) form values to the flags
  public static updateFlagsFromForm(flags: RqgChatMessageFlags, ev: Event): void {
    assertChatMessageFlagType(flags.type, "reputationCard");
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);
    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }
}
