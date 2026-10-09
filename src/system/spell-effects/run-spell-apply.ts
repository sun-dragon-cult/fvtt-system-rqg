import { localize } from "../util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  spellApplyScope,
  type SpellEffectApplied,
  type SpellEffectCast,
  type SpellApplyScope,
} from "./apply-spell-effect";
import { findSpellBehaviour, guardSpellBehaviour, type SpellBehaviour } from "./spell-behaviour";

/** What a player's client sends the GM to run a spell behaviour's `apply` that is `runAsGm`. */
export type ApplySpellBehaviourQueryData = {
  spellUuid: string;
  targetActorUuid: string;
  targetName: string;
  cast: SpellEffectCast;
};

const spellEffectOutcomes: readonly string[] = ["applied", "blocked", "resolved"];

async function runApply(
  behaviour: SpellBehaviour,
  scope: SpellApplyScope,
): Promise<SpellEffectApplied | undefined> {
  const result = await guardSpellBehaviour(scope.spell.name ?? "", () => behaviour.apply?.(scope));
  // A world's Macro override is untyped
  return spellEffectOutcomes.includes((result as { outcome?: string } | undefined)?.outcome ?? "")
    ? result
    : undefined;
}

/** Run a spell behaviour's `apply`, on the active GM's client when it is `runAsGm`. */
export async function runSpellApply(
  behaviour: SpellBehaviour,
  scope: SpellApplyScope,
): Promise<SpellEffectApplied | undefined> {
  if (!behaviour.runAsGm || game.user?.isGM) {
    return runApply(behaviour, scope);
  }
  const gm = game.users?.activeGM;
  if (!gm) {
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName: scope.spell.name ?? "" }),
    );
    return undefined;
  }
  const queryData: ApplySpellBehaviourQueryData = {
    spellUuid: scope.spell.uuid ?? "",
    targetActorUuid: scope.targetActor.uuid ?? "",
    targetName: scope.targetName,
    cast: scope.cast,
  };
  return (await gm.query("rqg.applySpellBehaviour", queryData)) as SpellEffectApplied | undefined;
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
  const behaviour = await findSpellBehaviour(spell as RqgItem);
  if (!behaviour?.runAsGm) {
    return undefined;
  }
  return runApply(
    behaviour,
    spellApplyScope(spell as RqgItem, targetActor as RqgActor, data.targetName, data.cast),
  );
}

export function initApplySpellBehaviourQuery(): void {
  CONFIG.queries["rqg.applySpellBehaviour"] = handleApplySpellBehaviourQuery;
}
