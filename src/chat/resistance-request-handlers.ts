import { activateChatTab, getRequiredDomDataset, localize } from "../system/util";
import { templatePaths } from "../system/load-handlebars-templates";
import { updateChatMessage } from "../sockets/socketable-requests";
import type { ResistanceRequestChatMessage } from "./data-model/resistance-request-chat-message.types.ts";
import { RqgLogger } from "../system/logging/rqg-logger";

const logger = new RqgLogger("ResistanceRequestHandlers");

/** Open the dialog to respond to a resistance-request chat card, or focus the one already open. */
export async function handleRollResistanceRequest(clickedButton: HTMLButtonElement): Promise<void> {
  const chatMessageId = getRequiredDomDataset(clickedButton, "message-id");
  const { RespondToResistanceRequestDialogV2 } =
    await import("../applications/resistance-roll-dialog/respond-to-resistance-request-dialog-v2");

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
    return logger.throw("No resistance request chat message found", { chatMessageId });
  }

  const targetTokenOrActor = await fromUuid(requestChatMessage.system.targetTokenOrActorUuid);
  if (!game.user?.isGM && !(targetTokenOrActor as any)?.isOwner) {
    ui.notifications?.warn(localize("RQG.Notification.Warn.NotOwnerOfResistanceRequest"));
    return;
  }

  const messageData = requestChatMessage.toObject();
  // Accepting lets the spell take effect, so the target learns what they let through.
  foundry.utils.mergeObject(
    messageData,
    { system: { state: "Accepted", spellHiddenFromUuid: "" } },
    { overwrite: true },
  );
  if (requestChatMessage.system.castFlavor) {
    messageData.flavor = requestChatMessage.system.castFlavor;
  }
  messageData.content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.resistanceRequestChatMessage,
    messageData.system,
  );

  activateChatTab();
  await updateChatMessage(requestChatMessage, messageData);
}
