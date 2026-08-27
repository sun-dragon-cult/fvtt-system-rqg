import { localize } from "../../system/util";
import { resolveActorFromUuid } from "./resistance-roll-shared.ts";
import type { ResistanceRequestSeed } from "./resistance-request-dialog-data.types.ts";

/**
 * Single GM entry point for opening the resistance-request dialog, shared by every UI surface
 * that offers it (actor sheet Combat tab, token HUD, combat tracker, Actors sidebar).
 *
 * Seeds the dialog from canvas state so the GM rarely has to pick sides by hand:
 * - invoked on a player-owned token/actor -> that's the active (rolling) side; the GM's current
 *   single target, if any, becomes the passive side;
 * - invoked on an NPC/monster -> that's the passive threat; a player-owned target becomes the
 *   active side;
 * - invoked with no context (e.g. a keybinding) -> only the active side is seeded, and only if
 *   the current target is player-owned.
 */
export async function openResistanceRequest(invokedTokenOrActorUuid?: string): Promise<void> {
  if (!game.user?.isGM) {
    ui.notifications?.warn(localize("RQG.Notification.Error.GMOnlyOperation"));
    return;
  }

  const targetUuid =
    game.user.targets.size === 1
      ? (game.user.targets.first()?.document?.uuid ?? undefined)
      : undefined;
  const invokedIsPlayerOwned =
    !!invokedTokenOrActorUuid && !!resolveActorFromUuid(invokedTokenOrActorUuid)?.hasPlayerOwner;
  const targetIsPlayerOwned = !!targetUuid && !!resolveActorFromUuid(targetUuid)?.hasPlayerOwner;

  let seed: ResistanceRequestSeed;
  if (invokedTokenOrActorUuid && invokedIsPlayerOwned) {
    seed = { activeUuid: invokedTokenOrActorUuid, passiveUuid: targetUuid };
  } else if (invokedTokenOrActorUuid) {
    seed = {
      passiveUuid: invokedTokenOrActorUuid,
      activeUuid: targetIsPlayerOwned ? targetUuid : undefined,
    };
  } else {
    seed = { activeUuid: targetIsPlayerOwned ? targetUuid : undefined };
  }

  const { ResistanceRequestDialogV2 } = await import("./resistance-request-dialog-v2.ts");
  await new ResistanceRequestDialogV2(seed).render({ force: true });
}
