import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { spellApplyScope, type SpellEffectCast } from "./apply-spell-effect";
import { groupEffectsByHook } from "./incoming-spell";
import { spellBehaviorForEffect } from "./spell-behavior";

/**
 * Whether one of the target's spell effects sends a spell back at its caster after the target's
 * resistance held (Reflection, RBM p.71): runs the effects' `onResisted` hooks, one group at a
 * time, until one reflects it. The cast record then adds an entry for the caster.
 */
export async function reflectsSpell(
  spell: RqgItem,
  targetActor: RqgActor,
  targetName: string,
  cast: SpellEffectCast,
): Promise<boolean> {
  const groups = groupEffectsByHook(
    targetActor.allApplicableEffects() as Iterable<ActiveEffect & { active: boolean }>,
    (effect) => spellBehaviorForEffect(effect)?.onResisted,
  );
  const scope = spellApplyScope(spell, targetActor, targetName, cast);
  for (const [onResisted, effects] of groups) {
    const result = await onResisted({ ...scope, effects });
    if (result?.outcome === "reflected") {
      return true;
    }
  }
  return false;
}
