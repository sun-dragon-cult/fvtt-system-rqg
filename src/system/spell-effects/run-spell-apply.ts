import { localize } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellApplyScope,
  type SpellEffectApplied,
  type SpellEffectCast,
  type SpellApplyScope,
} from "./apply-spell-effect";
import { spellBehaviorOf, type SpellBehavior } from "./spell-behavior";
import { interceptIncomingSpell } from "./incoming-spell";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("run-spell-apply");

/** What a player's client sends the GM to run a spell behavior's `apply` that is `runAsGm`. */
export type ApplySpellBehaviorQueryData = {
  spellUuid: string;
  targetActorUuid: string;
  targetName: string;
  cast: SpellEffectCast;
};

/**
 * Run a spell behavior's `apply` once the target's protective spells let the spell through, on
 * the active GM's client when it is `runAsGm`. Checks for that GM first, so protective spells
 * aren't used up by an Apply that can't run.
 */
export async function runSpellApply(
  behavior: SpellBehavior & Required<Pick<SpellBehavior, "apply">>,
  scope: SpellApplyScope,
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  const gm = behavior.runAsGm && !game.user?.isGM ? game.users?.activeGM : undefined;
  if (behavior.runAsGm && !game.user?.isGM && !gm) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }));
    return undefined;
  }
  const intercepted = await interceptIncomingSpell(scope);
  if (intercepted) {
    return intercepted;
  }
  if (!gm) {
    return behavior.apply(scope);
  }
  const queryData: ApplySpellBehaviorQueryData = {
    spellUuid: scope.spell.uuid ?? "",
    targetActorUuid: scope.targetActor.uuid ?? "",
    targetName: scope.targetName,
    cast: scope.cast,
  };
  try {
    return (await gm.query("rqg.applySpellBehavior", queryData)) as SpellEffectApplied | undefined;
  } catch (error) {
    logger.warn(
      localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }),
      undefined,
      error,
    );
    return undefined;
  }
}

async function handleApplySpellBehaviorQuery(
  data: ApplySpellBehaviorQueryData,
): Promise<SpellEffectApplied | undefined> {
  const [spell, targetActor] = await Promise.all([
    fromUuid(data.spellUuid),
    fromUuid(data.targetActorUuid),
  ]);
  if (!spell || !targetActor) {
    return undefined;
  }
  const behavior = spellBehaviorOf(spell as RqgItem);
  if (!behavior?.runAsGm || !behavior.apply) {
    return undefined;
  }
  return behavior.apply(
    spellApplyScope(spell as RqgItem, targetActor as RqgActor, data.targetName, data.cast),
  );
}

export function initApplySpellBehaviorQuery(): void {
  CONFIG.queries["rqg.applySpellBehavior"] = handleApplySpellBehaviorQuery;
}
