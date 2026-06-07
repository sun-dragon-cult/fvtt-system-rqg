import type { UpdateChatMessagePayload } from "./socketable-requests.types";

export type SocketAction = {
  payload: SocketActionPayload;
  socketMessageId?: string;
};

export type SocketActionPayload = UpdateChatMessagePayload;
