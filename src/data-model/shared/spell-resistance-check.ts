import type { RqgActor } from "@actors/rqg-actor.ts";
import { warnIfMultipleTargets } from "../../system/util";

/**
 * After a spell with `resistanceCheck === "single"` is cast successfully, open a POW vs POW
 * ResistanceRollDialogV2 pre-filled against the caster's current single target (#757).
 * Shared between Rune Magic and Spirit Magic post-cast hooks. This is deliberately a standalone
 * step (not folded into point-spending/experience bookkeeping) so it stays a clean pass/fail
 * "gate" that a future spell-effect trigger (#443) can sit behind.
 *
 * Silently does nothing with zero targets (not every spell targets someone), and warns (without
 * rolling) on more than one target - the caster should pick a single target before casting.
 */
export async function promptResistanceRollForSuccessfulCast(
  casterActor: RqgActor,
  token: TokenDocument | null | undefined,
  spellName: string | undefined,
): Promise<void> {
  const targetCount = game.user?.targets.size ?? 0;
  if (targetCount > 1) {
    warnIfMultipleTargets();
    return;
  }
  if (targetCount === 0) {
    return;
  }
  const targetTokenUuid = game.user?.targets.first()?.document?.uuid;
  if (!targetTokenUuid) {
    return;
  }

  // Dynamic import to avoid circular dependencies through rqgItem.ts, mirroring the other
  // dynamic imports in the rune/spirit magic data models.
  const { ResistanceRollDialogV2 } =
    await import("../../applications/resistance-roll-dialog/resistance-roll-dialog-v2");
  await new ResistanceRollDialogV2(casterActor, token, {
    active: {
      source: "tokenOrActor",
      tokenOrActorUuid: token?.uuid ?? casterActor.uuid ?? "",
      characteristicNames: ["power"],
    },
    passive: {
      source: "tokenOrActor",
      tokenOrActorUuid: targetTokenUuid,
      characteristicNames: ["power"],
    },
    description: spellName,
  }).render({ force: true });
}
