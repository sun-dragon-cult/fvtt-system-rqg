import type { UpdateChatMessagePayload } from "./SocketableRequests.types";

export type SocketAction = {
  payload: SocketActionPayload;
  socketMessageId?: string;
};

export type SocketActionPayload = UpdateChatMessagePayload;
