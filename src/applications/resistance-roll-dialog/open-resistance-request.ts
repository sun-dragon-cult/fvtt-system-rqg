import { localize } from "../../system/util";
import { resolveActorFromUuid } from "./resistance-roll-shared.ts";
import type { ResistanceRequestSeed } from "./resistance-request-dialog-data.types.ts";
import type { ResistanceRollSeed } from "./resistance-roll-dialog-data.types.ts";

/**
 * GM entry point for the resistance-table flow (actor sheet, token HUD, combat tracker, Actors
 * sidebar). Delegates to a player via {@link ResistanceRequestDialogV2} when one is involved,
 * otherwise opens {@link ResistanceRollDialogV2} for the GM to roll directly.
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

  // Nobody to delegate to - the GM rolls it directly.
  if (!invokedIsPlayerOwned && !targetIsPlayerOwned) {
    const seed: ResistanceRollSeed = invokedTokenOrActorUuid
      ? { activeUuid: invokedTokenOrActorUuid, passiveUuid: targetUuid }
      : { passiveUuid: targetUuid };
    const { ResistanceRollDialogV2 } = await import("./resistance-roll-dialog-v2.ts");
    await ResistanceRollDialogV2.openForGm(seed);
    return;
  }

  // The dialog's "who rolls" toggle can flip this; the seed just picks the common framing.
  let seed: ResistanceRequestSeed;
  if (invokedIsPlayerOwned) {
    seed = { activeUuid: invokedTokenOrActorUuid, passiveUuid: targetUuid, rollerSide: "active" };
  } else if (invokedTokenOrActorUuid) {
    // NPC invoked, player targeted: the player acts against the NPC.
    seed = { passiveUuid: invokedTokenOrActorUuid, activeUuid: targetUuid, rollerSide: "active" };
  } else {
    seed = { activeUuid: targetUuid, rollerSide: "active" };
  }

  const { ResistanceRequestDialogV2 } = await import("./resistance-request-dialog-v2.ts");
  await new ResistanceRequestDialogV2(seed).render({ force: true });
}
