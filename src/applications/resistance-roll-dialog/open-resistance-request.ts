import { localize } from "../../system/util";
import { resolveActorFromUuid } from "./resistance-roll-shared.ts";
import type { ResistanceRequestSeed } from "./resistance-request-dialog-data.types.ts";
import type { ResistanceRollSeed } from "./resistance-roll-dialog-data.types.ts";

/**
 * GM entry point for the resistance-table flow (actor sheet, token HUD, combat tracker, Actors
 * sidebar). The invoked token/actor is the active side and the target resists. "Whenever possible,
 * let the player be the one to make the roll, whether they are the active side or the passive
 * side" - so a player on either side gets a request card via {@link ResistanceRequestDialogV2},
 * and only an all-NPC contest opens {@link ResistanceRollDialogV2} for the GM to roll directly.
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

  const activeUuid = invokedTokenOrActorUuid ?? targetUuid;
  const passiveUuid = invokedTokenOrActorUuid ? targetUuid : undefined;
  const activeIsPlayerOwned = !!activeUuid && !!resolveActorFromUuid(activeUuid)?.hasPlayerOwner;
  const passiveIsPlayerOwned = !!passiveUuid && !!resolveActorFromUuid(passiveUuid)?.hasPlayerOwner;

  // Nobody to delegate to - the GM rolls it directly.
  if (!activeIsPlayerOwned && !passiveIsPlayerOwned) {
    const seed: ResistanceRollSeed = { activeUuid, passiveUuid };
    const { ResistanceRollDialogV2 } = await import("./resistance-roll-dialog-v2.ts");
    await ResistanceRollDialogV2.openForGm(seed);
    return;
  }

  // The dialog's "who rolls" toggle starts on the player-owned side and the GM can flip it.
  const seed: ResistanceRequestSeed = { activeUuid, passiveUuid };
  const { ResistanceRequestDialogV2 } = await import("./resistance-request-dialog-v2.ts");
  await new ResistanceRequestDialogV2(seed).render({ force: true });
}
