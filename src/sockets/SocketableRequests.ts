import { getGameUser } from "../system/util";
import { socketSend } from "./RqgSocket";
import { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import { ChatMessageDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

export async function deleteCombatant(
  combat: Combat,
  combatantIdsToDelete: string[],
): Promise<void> {
  if (combatantIdsToDelete.length > 0) {
    if (getGameUser().isGM) {
      await combat.deleteEmbeddedDocuments("Combatant", combatantIdsToDelete);
    } else {
      socketSend({
        action: "deleteCombatant",
        combatId: combat.id!,
        idsToDelete: combatantIdsToDelete,
      });
    }
  }
}

/**
 * Update a chat message. If the user is the author of the message, update it directly.
 * Otherwise, send a socket message to update it.
 */
export async function updateChatMessage(
  attackChatMessage: ChatMessage,
  messageData: PropertiesToSource<ChatMessageDataProperties>,
): Promise<void> {
  // @ts-expect-error author
  const chatMessageAuthorId = attackChatMessage.author.id;

  if (getGameUser().id === chatMessageAuthorId) {
    await attackChatMessage.update(messageData);
  } else {
    socketSend({
      action: "updateChatMessage",
      messageId: attackChatMessage.id ?? "",
      messageAuthorId: chatMessageAuthorId,
      update: messageData,
    });
  }
}
