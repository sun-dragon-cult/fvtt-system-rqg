import { hasActiveGm, localize } from "../util";
import type { SpellEffectApplied, SpellApplyScope } from "./apply-spell-effect";
import { spellBehaviorOf, type SpellBehavior } from "./spell-behavior";
import {
  applyRequestData,
  runApplyRequest,
  type SpellApplyRequestData,
} from "./spell-apply-request";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("run-spell-apply");

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

const applyQueryTimeoutMs = 60_000;

type RqgQuery =
  "rqg.applySpellBehavior" | "rqg.createSpellArea" | "rqg.summon" | "rqg.continueSpellCast";

/**
 * Run one of the system's queries on the active GM's client, for what players may not do. Warns,
 * naming the spell, when no GM is logged in or the query fails.
 */
export async function queryActiveGm<Q extends RqgQuery>(
  name: Q,
  data: Parameters<CONFIG.Queries[Q]>[0],
  spellName: string,
): Promise<Awaited<ReturnType<CONFIG.Queries[Q]>> | undefined> {
  const gm = game.users?.activeGM;
  if (!hasActiveGm(spellName) || !gm) {
    return undefined;
  }
  const needsGm = localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName });
  // A GM who leaves mid-Apply would otherwise keep that Apply waiting until a reload
  const timeout = name === "rqg.continueSpellCast" ? undefined : applyQueryTimeoutMs;
  try {
    return (await gm.query(name, data as any, { timeout })) as Awaited<
      ReturnType<CONFIG.Queries[Q]>
    >;
  } catch (error) {
    logger.warn(needsGm, undefined, error);
    return undefined;
  }
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
