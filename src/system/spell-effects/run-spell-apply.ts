import { localize } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellApplyScope,
  type SpellEffectApplied,
  type SpellEffectCast,
  type SpellApplyScope,
} from "./apply-spell-effect";
import { spellBehaviourOf, type SpellBehaviour } from "./spell-behaviour";
import { interceptIncomingSpell } from "./incoming-spell";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("run-spell-apply");

/** What a player's client sends the GM to run a spell behaviour's `apply` that is `runAsGm`. */
export type ApplySpellBehaviourQueryData = {
  spellUuid: string;
  targetActorUuid: string;
  targetName: string;
  cast: SpellEffectCast;
};

/**
 * Run a spell behaviour's `apply` once the target's protective spells let the spell through, on
 * the active GM's client when it is `runAsGm`. Checks for that GM first, so protective spells
 * aren't used up by an Apply that can't run.
 */
export async function runSpellApply(
  behaviour: SpellBehaviour & Required<Pick<SpellBehaviour, "apply">>,
  scope: SpellApplyScope,
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  const gm = behaviour.runAsGm && !game.user?.isGM ? game.users?.activeGM : undefined;
  if (behaviour.runAsGm && !game.user?.isGM && !gm) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }));
    return undefined;
  }
  const intercepted = await interceptIncomingSpell(scope);
  if (intercepted) {
    return intercepted;
  }
  if (!gm) {
    return behaviour.apply(scope);
  }
  const queryData: ApplySpellBehaviourQueryData = {
    spellUuid: scope.spell.uuid ?? "",
    targetActorUuid: scope.targetActor.uuid ?? "",
    targetName: scope.targetName,
    cast: scope.cast,
  };
  try {
    return (await gm.query("rqg.applySpellBehaviour", queryData)) as SpellEffectApplied | undefined;
  } catch (error) {
    logger.warn(
      localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }),
      undefined,
      error,
    );
    return undefined;
  }
}

async function handleApplySpellBehaviourQuery(
  data: ApplySpellBehaviourQueryData,
): Promise<SpellEffectApplied | undefined> {
  const [spell, targetActor] = await Promise.all([
    fromUuid(data.spellUuid),
    fromUuid(data.targetActorUuid),
  ]);
  if (!spell || !targetActor) {
    return undefined;
  }
  const behaviour = spellBehaviourOf(spell as RqgItem);
  if (!behaviour?.runAsGm || !behaviour.apply) {
    return undefined;
  }
  return behaviour.apply(
    spellApplyScope(spell as RqgItem, targetActor as RqgActor, data.targetName, data.cast),
  );
}

export function initApplySpellBehaviourQuery(): void {
  CONFIG.queries["rqg.applySpellBehaviour"] = handleApplySpellBehaviourQuery;
}
