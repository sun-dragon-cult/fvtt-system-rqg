import type { RqgActor } from "@actors/rqg-actor.ts";
import { warnIfMultipleTargets } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { SpellResistedByEnum } from "../item-data/spell";

/**
 * Post-cast hook shared by Rune Magic and Spirit Magic. When a resisted spell is cast
 * successfully, open a POW vs POW ResistanceRollDialogV2 pre-filled caster-vs-target (#757).
 * Deliberately a standalone step (not folded into point-spending/experience bookkeeping) so a
 * future spell-effect trigger (#443) can sit behind it.
 *
 * The resistance roll yields a graded success level (critical … fumble), not a bare pass/fail:
 * some spells key effects off the degree, and even a failed roll can carry an effect. Whatever
 * consumes the outcome must read `ResistanceRoll.successLevel`.
 *
 * Only `ResistanceRoll` is handled; the area / spirit-combat `resistedBy` modes are inert here
 * until their own issues wire them up (#1068). Silently does nothing with zero targets (not every
 * spell targets someone), and warns (without rolling) on more than one target - the caster should
 * pick a single target before casting.
 */
export async function maybePromptResistanceRollForCast(
  resistedBy: SpellResistedByEnum,
  castSuccessLevel: AbilitySuccessLevelEnum,
  casterActor: RqgActor,
  token: TokenDocument | null | undefined,
  spellName: string | undefined,
): Promise<void> {
  if (
    resistedBy !== SpellResistedByEnum.ResistanceRoll ||
    castSuccessLevel > AbilitySuccessLevelEnum.Success
  ) {
    return;
  }

  const targetCount = game.user?.targets.size ?? 0;
  if (targetCount > 1) {
    warnIfMultipleTargets();
    return;
  }
  const targetTokenUuid = game.user?.targets.first()?.document?.uuid;
  if (targetCount === 0 || !targetTokenUuid) {
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
