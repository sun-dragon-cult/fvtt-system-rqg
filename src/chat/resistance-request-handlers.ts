import { activateChatTab, getRequiredDomDataset, localize } from "../system/util";
import { templatePaths } from "../system/load-handlebars-templates";
import { updateChatMessage } from "../sockets/socketable-requests";
import type { ResistanceRequestChatMessage } from "./data-model/resistance-request-chat-message.types.ts";
import { RqgLogger } from "../system/logging/rqg-logger";
import { ERR } from "../system/error-registry";

const logger = new RqgLogger("ResistanceRequestHandlers");

/** Open the dialog to respond to a resistance-request chat card, or focus the one already open. */
export async function handleRollResistanceRequest(clickedButton: HTMLButtonElement): Promise<void> {
  const chatMessageId = getRequiredDomDataset(clickedButton, "message-id");
  const { RespondToResistanceRequestDialogV2 } =
    await import("../applications/resistance-roll-dialog/respond-to-resistance-request-dialog-v2");

  const requestChatMessage = game.messages?.get(chatMessageId) as
    ResistanceRequestChatMessage | undefined;
  if (
    requestChatMessage &&
    (requestChatMessage.system.state !== "Requested" || requestChatMessage.system.gmRuling)
  ) {
    ui.notifications?.warn(localize("RQG.Notification.Warn.ResistanceRequestAlreadyAnswered"));
    return;
  }

  const existing = foundry.applications.instances.get(
    RespondToResistanceRequestDialogV2.idForChatMessage(chatMessageId),
  );
  // A forced render maximizes and brings to front, so reusing it keeps any modifiers already picked.
  await (existing ?? new RespondToResistanceRequestDialogV2(chatMessageId)).render({ force: true });
}

/** RAW p.242: the target may voluntarily and knowingly accept a spell instead of resisting it. */
export async function handleAcceptResistanceRequest(
  clickedButton: HTMLButtonElement,
): Promise<void> {
  const chatMessageId = getRequiredDomDataset(clickedButton, "message-id");
  const requestChatMessage = game.messages?.get(chatMessageId) as
    ResistanceRequestChatMessage | undefined;
  if (!requestChatMessage) {
    logger.error(ERR.resistanceMessageMissing, { chatMessageId });
    return;
  }

  // A stale card can still show the buttons after someone else has answered it.
  if (
    requestChatMessage.system.state !== "Requested" ||
    !!requestChatMessage.system.gmRuling ||
    !requestChatMessage.system.allowVoluntaryAccept
  ) {
    ui.notifications?.warn(localize("RQG.Notification.Warn.ResistanceRequestAlreadyAnswered"));
    return;
  }

  const targetTokenOrActor = await fromUuid(requestChatMessage.system.targetTokenOrActorUuid);
  if (!game.user?.isGM && !(targetTokenOrActor as any)?.isOwner) {
    ui.notifications?.warn(localize("RQG.Notification.Warn.NotOwnerOfResistanceRequest"));
    return;
  }

  // Accepting lets the spell take effect, so the target learns what they let through.
  await submitResistanceAnswer(
    requestChatMessage,
    { state: "Accepted" },
    { revealSpell: true },
    "accepted",
  );
}

/**
 * Answer a resistance request. A spell's goes to its cast record on the active GM's client, which
 * writes the answer on the card, settles the target and lets Reflection act; any other request is
 * written here.
 */
export async function submitResistanceAnswer(
  requestChatMessage: ResistanceRequestChatMessage,
  systemPatch: Record<string, unknown>,
  options: ResistanceRequestUpdateOptions,
  result: "accepted" | "overcame" | "held",
  casterSuccessLevel?: number,
): Promise<void> {
  const system = requestChatMessage.system;
  // The combined card holds its own cast record
  const recordId = system.targets?.length ? requestChatMessage.id : system.spellCastMessageId;
  if (!system.isSpellCast || !system.entryId || !recordId) {
    await answerResistanceRequest(requestChatMessage, systemPatch, options);
    return;
  }
  activateChatTab();
  // Dynamic import to avoid a circular dependency through rqgItem.ts.
  const { advanceSpellCast } = await import("../system/spell-effects/spell-cast-runner");
  await advanceSpellCast(
    recordId,
    [{ kind: "resistance", entryId: system.entryId, result, casterSuccessLevel }],
    {
      messageId: requestChatMessage.id ?? "",
      system: systemPatch,
      whisper: options.whisper,
      blind: options.blind,
    },
  );
}

/**
 * Settle a resistance request: patch its system data, re-render the card from it, and write it back.
 * `revealSpell` lifts the concealment a combined cast card puts on the target - the spell took
 * effect, so they now know what it was. Shared so Resist and Accept can't drift apart.
 */
export async function answerResistanceRequest(
  requestChatMessage: ResistanceRequestChatMessage,
  systemPatch: Record<string, unknown>,
  options: ResistanceRequestUpdateOptions,
): Promise<void> {
  const messageData = await resistanceRequestUpdate(requestChatMessage, systemPatch, options);
  activateChatTab();
  // A GM may update any message, and needn't wait on an author who might be offline.
  if (game.user?.isGM) {
    await requestChatMessage.update(messageData as ChatMessage.UpdateData);
  } else {
    await updateChatMessage(requestChatMessage, messageData);
  }
}

export type ResistanceRequestUpdateOptions = {
  revealSpell: boolean;
  whisper?: string[] | undefined;
  blind?: boolean | undefined;
};

/** A resistance request's whole message data with `systemPatch` applied and its card re-rendered. */
export async function resistanceRequestUpdate(
  requestChatMessage: ResistanceRequestChatMessage,
  systemPatch: Record<string, unknown>,
  options: ResistanceRequestUpdateOptions,
): Promise<ReturnType<ResistanceRequestChatMessage["toObject"]>> {
  const messageData = requestChatMessage.toObject();
  foundry.utils.mergeObject(
    messageData,
    {
      system: { ...systemPatch, ...(options.revealSpell ? { spellHiddenFromUuid: "" } : {}) },
      ...(options.whisper !== undefined ? { whisper: options.whisper } : {}),
      ...(options.blind !== undefined ? { blind: options.blind } : {}),
    },
    { overwrite: true },
  );
  if (options.revealSpell && requestChatMessage.system.castFlavor) {
    messageData.flavor = requestChatMessage.system.castFlavor;
  }
  messageData.content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.resistanceRequestChatMessage,
    messageData.system,
  );
  return messageData;
}
