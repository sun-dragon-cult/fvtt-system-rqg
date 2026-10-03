import { Rqid } from "../api/rqid-api";
import { systemId } from "../config";
import { resolveActorFromUuid } from "../../applications/resistance-roll-dialog/resistance-roll-shared";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { SpellEffectApplied, SpellMacroScope } from "./apply-spell-effect";

/**
 * The scope a protective effect's macro (`flags.rqg.onIncomingSpell`) runs with when a spell is
 * applied to its actor - a contract with content modules, like SpellMacroScope. `effects` are all
 * the target's active effects linking that macro, so layered defences can be decided together. The
 * macro returns `{ outcome: "stopped" }` to stop the spell, and may change or delete those effects.
 */
export type IncomingSpellScope = SpellMacroScope & { effects: ActiveEffect[] };

type EffectLike = { active: boolean; flags?: Record<string, any> };

/** The target's active effects that react to incoming spells, grouped by the macro they link. */
export function groupByIncomingSpellMacro<T extends EffectLike>(
  effects: Iterable<T>,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const effect of effects) {
    const macroRqid = effect.flags?.[systemId]?.onIncomingSpell as string | undefined;
    if (effect.active && macroRqid) {
      const group = groups.get(macroRqid) ?? [];
      group.push(effect);
      groups.set(macroRqid, group);
    }
  }
  return groups;
}

/**
 * Whether the spell comes from outside the target. Defences are layers around the target, so they
 * don't stop spells it casts itself (Core Q&A). One put on from the token HUD without "Cast by"
 * ticked has no caster and counts as cast by someone else.
 */
function isFromOutside(casterUuid: string, targetActor: RqgActor): boolean {
  return !casterUuid || resolveActorFromUuid(casterUuid)?.uuid !== targetActor.uuid;
}

/** Run the target's protective macros; the blocked result when one of them stops the spell. */
export async function interceptIncomingSpell(
  scope: SpellMacroScope,
): Promise<SpellEffectApplied | undefined> {
  if (!isFromOutside(scope.cast.casterUuid, scope.targetActor)) {
    return undefined;
  }
  const groups = groupByIncomingSpellMacro(
    scope.targetActor.allApplicableEffects() as Iterable<ActiveEffect & EffectLike>,
  );
  for (const [macroRqid, effects] of groups) {
    const macro = await Rqid.fromRqid(macroRqid);
    if (!(macro instanceof Macro)) {
      continue;
    }
    const incomingScope: IncomingSpellScope = { ...scope, effects };
    const result = (await macro.execute(incomingScope as any)) as { outcome?: string } | undefined;
    if (result?.outcome === "stopped") {
      return { outcome: "blocked", reason: "intercepted" };
    }
  }
  return undefined;
}
