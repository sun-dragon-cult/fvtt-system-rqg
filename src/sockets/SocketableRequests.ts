import { socketSend } from "./RqgSocket";

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

  if (game.user?.id === chatMessageAuthorId) {
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
