import { hasActiveGm, localize } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellApplyScope,
  type SpellEffectApplied,
  type SpellEffectCast,
  type SpellApplyScope,
} from "./apply-spell-effect";
import { spellBehaviorOf, type SpellBehavior } from "./spell-behavior";
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
  const queryData: ApplySpellBehaviorQueryData = {
    spellUuid: scope.spell.uuid ?? "",
    targetActorUuid: scope.targetActor.uuid ?? "",
    targetName: scope.targetName,
    cast: scope.cast,
  };
  return queryActiveGm("rqg.applySpellBehavior", queryData, spellName);
}

type RqgQuery = "rqg.applySpellBehavior" | "rqg.createSpellArea" | "rqg.advanceSpellCast";

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
  try {
    return (await gm.query(name, data as any)) as Awaited<ReturnType<CONFIG.Queries[Q]>>;
  } catch (error) {
    logger.warn(needsGm, undefined, error);
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
