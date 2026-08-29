import { localize } from "../../system/util";
import { resolveActorFromUuid } from "./resistance-roll-shared.ts";
import type { ResistanceRequestSeed } from "./resistance-request-dialog-data.types.ts";
import type { ResistanceRollSeed } from "./resistance-roll-dialog-data.types.ts";

/**
 * Single GM entry point for the resistance-table flow, shared by every UI surface that offers it
 * (actor sheet Combat tab, token HUD, combat tracker, Actors sidebar).
 *
 * Picks the dialog from canvas state:
 * - a player-owned actor is on one side -> {@link ResistanceRequestDialogV2}: post a roll-request
 *   card to that player (invoked player = active; an invoked NPC with a player-owned target =
 *   that player acting against the NPC);
 * - neither side is player-owned -> {@link ResistanceRollDialogV2}: nobody to hand a card to
 *   (its Roll button is owner-gated), so the GM rolls it directly - an NPC's POW-vs-POW, a
 *   poison's POT-vs-CON, an improvised STR contest.
 *
 * Either way the current single target fills the side the invocation didn't.
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

  // No player on either side: a request card would only ever be actionable by the GM, so open
  // the direct roll dialog for the GM to roll instead.
  if (!invokedIsPlayerOwned && !targetIsPlayerOwned) {
    const seed: ResistanceRollSeed = invokedTokenOrActorUuid
      ? { activeUuid: invokedTokenOrActorUuid, passiveUuid: targetUuid }
      : { passiveUuid: targetUuid };
    const { ResistanceRollDialogV2 } = await import("./resistance-roll-dialog-v2.ts");
    await ResistanceRollDialogV2.openForGm(seed);
    return;
  }

  let seed: ResistanceRequestSeed;
  if (invokedIsPlayerOwned) {
    // The invoked player is the one asked to roll; the target, if any, is what they resist.
    seed = { activeUuid: invokedTokenOrActorUuid, passiveUuid: targetUuid };
  } else if (invokedTokenOrActorUuid) {
    // Invoked on an NPC while a player is targeted: that player acts against the NPC.
    seed = { passiveUuid: invokedTokenOrActorUuid, activeUuid: targetUuid };
  } else {
    // No invocation context (e.g. a keybinding), only a player-owned target.
    seed = { activeUuid: targetUuid };
  }

  const { ResistanceRequestDialogV2 } = await import("./resistance-request-dialog-v2.ts");
  await new ResistanceRequestDialogV2(seed).render({ force: true });
}
