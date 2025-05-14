import { DeleteCombatantPayload, UpdateChatMessagePayload } from "./SocketableRequests.types";

export type SocketAction = {
  payload: SocketActionPayload;
  socketMessageId?: string;
};

export type SocketActionPayload = DeleteCombatantPayload | UpdateChatMessagePayload;
