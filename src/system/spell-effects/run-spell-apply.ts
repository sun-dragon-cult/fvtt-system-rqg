import { localize } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellApplyScope,
  spellEffectCast,
  type SpellEffectApplied,
  type SpellEffectCast,
  type SpellApplyScope,
} from "./apply-spell-effect";
import { spellBehaviorOf, type SpellBehavior } from "./spell-behavior";
import { interceptIncomingSpell } from "./incoming-spell";
import { castAcrossSpellAreas } from "./spell-across";
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
 * aren't used up by an Apply that can't run. A spell from a card met them when it was cast or reflected.
 */
export async function runSpellApply(
  behavior: SpellBehavior & Required<Pick<SpellBehavior, "apply">>,
  scope: SpellApplyScope,
  barriersChecked = false,
): Promise<SpellEffectApplied | undefined> {
  const spellName = scope.spell.name ?? "";
  const gm = behavior.runAsGm && !game.user?.isGM ? game.users?.activeGM : undefined;
  if (behavior.runAsGm && !game.user?.isGM && !gm) {
    ui.notifications?.warn(localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName }));
    return undefined;
  }
  const intercepted = barriersChecked ? undefined : await interceptIncomingSpell(scope);
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
  return queryActiveGm("rqg.applySpellBehavior", queryData, spellName);
}

type RqgQuery =
  | "rqg.applySpellBehavior"
  | "rqg.reflectResistedSpell"
  | "rqg.createSpellArea"
  | "rqg.interceptSpellCast";

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
  const needsGm = localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName });
  if (!gm) {
    ui.notifications?.warn(needsGm);
    return undefined;
  }
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

/** What the caster's client sends the GM to meet a spell's targets' protective spells. */
export type InterceptSpellCastData = {
  spellUuid: string;
  targetUuids: string[];
  rollOptions: { levelUsed?: number; magicPointBoost?: number };
  casterUuid: string;
  casterSuccessLevel: number | undefined;
  /** Reflected back at its caster, who is then the target. */
  reflected?: boolean;
};

async function stoppedTargets(data: InterceptSpellCastData): Promise<string[]> {
  const spell = (await fromUuid(data.spellUuid)) as RqgItem | null;
  if (!spell) {
    return [];
  }
  const cast = spellEffectCast(spell, data.rollOptions, {
    casterUuid: data.casterUuid,
    castMessageId: "",
    casterSuccessLevel: data.casterSuccessLevel,
  });
  await castAcrossSpellAreas(spell, cast, data.targetUuids);
  const stopped: string[] = [];
  for (const targetUuid of data.targetUuids) {
    const target = await fromUuid(targetUuid);
    const targetActor = (
      target instanceof TokenDocument ? target.actor : target
    ) as RqgActor | null;
    if (!(targetActor instanceof Actor)) {
      continue;
    }
    const targetName = (target as { name?: string }).name ?? targetActor.name ?? "";
    const scope = spellApplyScope(spell, targetActor, targetName, cast);
    if (await interceptIncomingSpell(scope, !!data.reflected)) {
      stopped.push(targetUuid);
    }
  }
  return stopped;
}

/**
 * The targets whose protective spells stop a spell as it is cast, before anyone resists it
 * (RBM p.111), after the spell areas it crosses on the way had their say. Run once per cast, on a
 * GM's client, since stopping it can use up Countermagic and sound a ward's alarm. Without an
 * active GM a player's cast meets none.
 */
export async function interceptSpellCast(data: InterceptSpellCastData): Promise<string[]> {
  if (!data.targetUuids.length) {
    return [];
  }
  if (game.user?.isGM) {
    return stoppedTargets(data);
  }
  const spellName = (fromUuidSync(data.spellUuid) as { name?: string } | null)?.name ?? "";
  return (await queryActiveGm("rqg.interceptSpellCast", data, spellName)) ?? [];
}

export function initInterceptSpellCastQuery(): void {
  CONFIG.queries["rqg.interceptSpellCast"] = stoppedTargets;
}
