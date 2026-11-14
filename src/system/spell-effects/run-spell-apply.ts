import { hasActiveGm } from "../util";
import { queryActiveGm } from "./query-active-gm";
import type { SpellEffectApplied, SpellApplyScope } from "./apply-spell-effect";
import { spellBehaviorOf, type SpellBehavior } from "./spell-behavior";
import {
  applyRequestData,
  runApplyRequest,
  type SpellApplyRequestData,
} from "./spell-apply-request";

/** What a player's client sends the GM to run a spell behavior's `apply` that is `runAsGm`. */
export type ApplySpellBehaviorQueryData = SpellApplyRequestData;

/**
 * Run a spell behavior's `apply` on the clicker's client, or on the active GM's when it is
 * `runAsGm`. The target's protective spells already met the spell before Apply was offered.
 */
export async function runSpellApply(
  behavior: SpellBehavior & Required<Pick<SpellBehavior, "apply">>,
  scope: SpellApplyScope,
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  if (behavior.runAsGm && !game.user?.isGM && !hasActiveGm(spellName)) {
    return undefined;
  }
  const gm = behavior.runAsGm && !game.user?.isGM ? game.users?.activeGM : undefined;
  if (!gm) {
    return behavior.apply(scope);
  }
  return queryActiveGm("rqg.applySpellBehavior", applyRequestData(scope), spellName);
}

/**
 * Run a `runAsGm` behavior's `apply` for a player. Without a cast record (the token HUD "+") only a
 * GM may ask, since such a behavior acts on what its target's owner may not change.
 */
export async function handleApplySpellBehaviorQuery(
  data: ApplySpellBehaviorQueryData,
  { user }: RqgQueryContext,
): Promise<SpellEffectApplied | undefined> {
  if (!data.request && !user.isGM) {
    return undefined;
  }
  return runApplyRequest(data, user, async (scope) => {
    const behavior = spellBehaviorOf(scope.spell);
    return behavior?.runAsGm && behavior.apply ? behavior.apply(scope) : undefined;
  });
}

export function initApplySpellBehaviorQuery(): void {
  CONFIG.queries["rqg.applySpellBehavior"] = handleApplySpellBehaviorQuery;
}
