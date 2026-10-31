import type { RqgActor } from "@actors/rqg-actor.ts";
import type { SpellEffectApplied, SpellApplyScope, SpellEffectCast } from "./apply-spell-effect";
import { spellBehaviorForEffect, type IncomingSpellScope } from "./spell-behavior";

/**
 * Active effects grouped by a hook of the spell that made them. Spells that share a hook
 * (Countermagic and Shield) form one group, so layered defences are decided together.
 */
export function groupEffectsByHook<T extends { active: boolean }, F>(
  effects: Iterable<T>,
  hookOf: (effect: T) => F | undefined,
): Map<F, T[]> {
  const groups = new Map<F, T[]>();
  for (const effect of effects) {
    const hook = effect.active ? hookOf(effect) : undefined;
    if (hook) {
      const group = groups.get(hook) ?? [];
      group.push(effect);
      groups.set(hook, group);
    }
  }
  return groups;
}

/**
 * Whether the spell comes from outside the target. Defences are layers around the target, so they
 * don't stop spells it casts itself (Core Q&A). One put on from the token HUD without "Cast by"
 * ticked has no caster and counts as cast by someone else.
 */
function isFromOutside(cast: SpellEffectCast, targetActor: RqgActor): boolean {
  return !cast.casterActorUuid || cast.casterActorUuid !== targetActor.uuid;
}

/**
 * Run the target's protective spells' hooks; the blocked result when one of them stops the spell.
 * A reflected spell comes at its caster from outside, from the one who reflected it.
 */
export async function interceptIncomingSpell(
  scope: SpellApplyScope,
  reflected = false,
): Promise<SpellEffectApplied | undefined> {
  if (!reflected && !isFromOutside(scope.cast, scope.targetActor)) {
    return undefined;
  }
  const groups = groupEffectsByHook(
    scope.targetActor.allApplicableEffects() as Iterable<ActiveEffect & { active: boolean }>,
    (effect) => spellBehaviorForEffect(effect)?.onIncomingSpell,
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
