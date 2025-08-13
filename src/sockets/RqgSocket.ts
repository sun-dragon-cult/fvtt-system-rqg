import { systemId } from "../system/config";
import { getSocket, RqgError } from "../system/util";
import type { SocketAction, SocketActionPayload } from "./RqgSocket.types";

const eventNameSpace = `system.${systemId}`;
const pendingRequests = new Map<string, (value: unknown) => void>(); // socketMessageId to stored promise

/**
 * Start the handler for socket messages
 */
export function initSockets() {
  getSocket().on(eventNameSpace, handleSocketMsg);
}

// Request - response pattern
export async function socketRequest(payload: SocketActionPayload): Promise<any> {
  // TODO Add a race between a timeout and the Promise to clear the pendingRequests
  return new Promise((resolve) => {
    const messageId = randomID();
    pendingRequests.set(messageId, resolve);
    getSocket().emit(eventNameSpace, { messageId: messageId, payload: payload });
  });
}

// Send and forget
export function socketSend(payload: SocketActionPayload): void {
  getSocket().emit(eventNameSpace, { payload: payload });
}

async function handleSocketMsg(request: SocketAction): Promise<void> {
  // let responsePromise;

  if (request.socketMessageId) {
    // responsePromise = pendingRequests.get(request.socketMessageId);
    pendingRequests.delete(request.socketMessageId);
  }

  switch (request.payload.action) {
    case "updateChatMessage": {
      if (game.user?.id !== request.payload.messageAuthorId) {
        return;
      }

      const attackChatMessage = game.messages?.get(request.payload.messageId);
      attackChatMessage?.update(request.payload.update);
      break;
    }

    // --- Left here as an example for any future implementation that might need a request-response message

    // case "deleteCombatantsRequest": {
    //   if (!game.user?.isGM) {
    //     return;
    //   }
    //   const combat = game.combats?.get(request.payload?.combatId);
    //   const idsToDelete = request.payload?.idsToDelete;
    //   combat?.deleteEmbeddedDocuments("Combatant", idsToDelete);
    //   getSocket().emit(eventNameSpace, {
    //     socketMessageId: request.socketMessageId,
    //     payload: { action: "deleteCombatantsResponse", response: "deleted it now" },
    //   });
    //   break;
    // }

    // case "deleteCombatantsResponse": {
    //   if (responsePromise) {
    //     responsePromise(request.payload.response);
    //   }
    //   break;
    // }

    // ---

    default: {
      const msg = `Got unknown socket action in payload`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, request);
    }
  }
}

// function isResponsibleGM() {
//   if (!game.user?.isGM) {
//     return false;
//   }
//   const connectedGMs = getGameUsers().filter(isActiveGM);
//   return !connectedGMs.some((other) => other.id < (game.user?.id ?? " "));
// }
//
// function isActiveGM(user: User) {
//   return user.active && user.isGM;
// }
