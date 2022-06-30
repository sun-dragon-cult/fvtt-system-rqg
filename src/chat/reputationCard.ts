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
  moveCursorToEnd,
  requireValue,
  usersThatOwnActor,
} from "../system/util";
import { ReputationCardFlags } from "../data-model/shared/rqgDocumentFlags";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export class ReputationCard {
  public static async show(actor: RqgActor, token: TokenDocument | null): Promise<void> {
    const iconSettings = getGame().settings.get("rqg", "defaultItemIconSettings");

    const flags: ReputationCardFlags = {
      type: "reputation",
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

  public static async inputChangeHandler(ev: Event, messageId: string): Promise<void> {
    const chatMessage = getGame().messages?.get(messageId);
    requireValue(chatMessage, localize("RQG.Dialog.Common.CantFindChatMessageError"));

    const flags = chatMessage.data.flags.rqg;
    assertChatMessageFlagType(flags?.type, "reputation");
    ReputationCard.updateFlagsFromForm(flags, ev);

    const data = await ReputationCard.renderContent(flags);
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
      (m) => !!m.closest<HTMLElement>(".chat-popout") === isFromPopoutChat
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
    assertChatMessageFlagType(flags?.type, "reputation");
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

  private static async renderContent(flags: ReputationCardFlags): Promise<object> {
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
      whisper: usersThatOwnActor(actor),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      flags: {
        core: { canPopout: true },
        rqg: flags,
      },
    };
  }

  private static async getFormDataFromFlags(
    flags: ReputationCardFlags
  ): Promise<{ modifier: number; reputationValue: number }> {
    const actor = await getDocumentFromUuid<RqgActor>(flags.card.actorUuid);
    assertActorType(actor?.data.type, ActorTypeEnum.Character);
    const reputationValue: number = Number(actor.data.data.background.reputation) || 0;

    const modifier = convertFormValueToInteger(flags.formData.modifier);
    return { reputationValue: reputationValue, modifier: modifier };
  }

  // Store the current raw string (FormDataEntryValue) form values to the flags
  private static updateFlagsFromForm(flags: ReputationCardFlags, ev: Event): void {
    const form = (ev.target as HTMLElement)?.closest("form") as HTMLFormElement;
    const formData = new FormData(form);
    flags.formData.modifier = cleanIntegerString(formData.get("modifier"));
  }
}
