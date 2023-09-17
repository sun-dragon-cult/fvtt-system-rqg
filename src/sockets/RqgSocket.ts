import { systemId } from "../system/config";
import { getGame, getGameUser, getSocket, RqgError } from "../system/util";

type SocketAction = "deleteCombatant";

type SocketRequest = {
  action: SocketAction;
  payload: any;
  messageId?: string;
};

type DeleteCombatantPayload = {
  combatId: string;
  idsToDelete: string[];
};

type ActionPayload = DeleteCombatantPayload;

const eventNameSpace = `system.${systemId}`;
const pendingRequests = new Map<string, (value: unknown) => void>(); // messageId to stored promise

/**
 * Start the handler for socket messages
 */
export function initSockets() {
  getSocket().on(eventNameSpace, handleSocketMsg);
}

// Request - response pattern
export async function socketRequest(action: SocketAction, payload: ActionPayload): Promise<any> {
  // TODO Add a race between a timeout and the Promise to clear the pendingRequests
  return new Promise((resolve) => {
    const messageId = randomID();
    pendingRequests.set(messageId, resolve);
    getSocket().emit(eventNameSpace, { action: action, messageId: messageId, payload: payload });
  });
}

// Send and forget
export function socketSend(action: SocketAction, payload: ActionPayload): void {
  getSocket().emit(eventNameSpace, { action: action, payload: payload });
}

function handleSocketMsg(request: SocketRequest, userId: string): void {
  // let responsePromise;

  if (request.messageId) {
    // responsePromise = pendingRequests.get(request.messageId);
    pendingRequests.delete(request.messageId);
  }

  switch (request.action) {
    case "deleteCombatant": {
      if (!getGameUser().isGM) {
        return;
      }
      const combat = getGame().combats?.get(request.payload?.combatId);
      const idsToDelete = request.payload?.idsToDelete;
      combat?.deleteEmbeddedDocuments("Combatant", idsToDelete);
      break;
    }

    // --- Left here as an example for any future implementation that might need a request-response message

    // case "deleteCombatantRequest": {
    //   if (!getGameUser().isGM) {
    //     return;
    //   }
    //   const combat = getGame().combats?.get(request.payload?.combatId);
    //   const idsToDelete = request.payload?.idsToDelete;
    //   combat?.deleteEmbeddedDocuments("Combatant", idsToDelete);
    //   getSocket().emit(eventNameSpace, {
    //     action: "deleteCombatantResponse",
    //     messageId: request.messageId,
    //     payload: { response: "deleted it now" },
    //   });
    //   break;
    // }

    // case "deleteCombatantResponse": {
    //   if (responsePromise) {
    //     responsePromise(request.payload.response);
    //   }
    //   break;
    // }

    // ---

    default: {
      const msg = `Got unknown socket action: ${request.action}`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, request, userId);
    }
  }
}
