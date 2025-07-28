import { getGameUser } from "../system/util";
import { socketSend } from "./RqgSocket";
import type { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import type { ChatMessageDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

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
