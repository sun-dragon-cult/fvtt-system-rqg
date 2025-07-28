import type { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import type { ChatMessageDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData";

export type UpdateChatMessagePayload = {
  action: "updateChatMessage"; // action is a Discriminated Union
  messageId: string;
  messageAuthorId: string; // Owner of the chat message (userId)
  update: PropertiesToSource<ChatMessageDataProperties>;
};
