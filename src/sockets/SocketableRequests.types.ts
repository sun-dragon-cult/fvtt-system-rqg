export type UpdateChatMessagePayload = {
  action: "updateChatMessage"; // action is a Discriminated Union
  messageId: string;
  messageAuthorId: string; // Owner of the chat message (userId)
  update: PropertiesToSource<ChatMessageDataProperties>;
};
