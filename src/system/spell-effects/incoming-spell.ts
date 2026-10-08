import { resolveActorFromUuid } from "../../applications/resistance-roll-dialog/resistance-roll-shared";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { SpellEffectApplied, SpellApplyScope } from "./apply-spell-effect";
import {
  spellBehaviourForEffect,
  type IncomingSpellScope,
  type SpellBehaviour,
} from "./spell-behaviour";

type OnIncomingSpell = NonNullable<SpellBehaviour["onIncomingSpell"]>;

/**
 * Active effects grouped by the `onIncomingSpell` hook of the spell that made them. Spells that
 * share a hook (Countermagic and Shield) form one group, so layered defences are decided together.
 */
export function groupByIncomingSpellHook<T extends { active: boolean }>(
  effects: Iterable<T>,
  hookOf: (effect: T) => OnIncomingSpell | undefined,
): Map<OnIncomingSpell, T[]> {
  const groups = new Map<OnIncomingSpell, T[]>();
  for (const effect of effects) {
    const hook = effect.active ? hookOf(effect) : undefined;
    if (hook) {
      groups.set(hook, [...(groups.get(hook) ?? []), effect]);
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

/** Run the target's protective spells' hooks; the blocked result when one of them stops the spell. */
export async function interceptIncomingSpell(
  scope: SpellApplyScope,
): Promise<SpellEffectApplied | undefined> {
  if (!isFromOutside(scope.cast.casterUuid, scope.targetActor)) {
    return undefined;
  }
  const spellEffects = [
    ...(scope.targetActor.allApplicableEffects() as Iterable<ActiveEffect>),
  ].filter((effect: any) => effect.active && effect.system?.spell?.spellRqid);
  const hooks = new Map<ActiveEffect, OnIncomingSpell | undefined>();
  for (const effect of spellEffects) {
    hooks.set(effect, (await spellBehaviourForEffect(effect))?.onIncomingSpell);
  }
  const groups = groupByIncomingSpellHook(
    spellEffects as (ActiveEffect & { active: boolean })[],
    (effect) => hooks.get(effect),
  );
  for (const [onIncomingSpell, effects] of groups) {
    const incomingScope: IncomingSpellScope = { ...scope, effects };
    const result = await onIncomingSpell(incomingScope);
    if (result?.outcome === "stopped") {
      return { outcome: "blocked", reason: "intercepted" };
    }
  }
  return undefined;
}
