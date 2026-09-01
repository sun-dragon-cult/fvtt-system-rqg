import type { RqgActor } from "@actors/rqg-actor.ts";
import { warnIfMultipleTargets } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { SpellResistedByEnum } from "../item-data/spell";

/**
 * Post-cast hook for Rune/Spirit Magic: on a successful cast of a resisted spell, open a
 * POW-vs-POW ResistanceRollDialogV2 caster-vs-target. No-op with no target; warns on multiple.
 * Only `ResistanceRoll` is handled; the area / spirit-combat modes are inert until #1068's
 * follow-ups wire them up.
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

  // Dynamic import to avoid a circular dependency through rqgItem.ts.
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
