import type { RqgActor } from "@actors/rqg-actor.ts";
import { onRqgHook } from "../fvtt-type-compat";
import { groupEffectsByHook } from "./incoming-spell";
import {
  spellBehaviourForEffect,
  type SpellRollEntries,
  type SpellRollEntryName,
} from "./spell-behaviour";

type EntryArgs<N extends SpellRollEntryName> = Omit<
  Parameters<NonNullable<SpellRollEntries[N]>>[0],
  "effects"
>;

/** Run a roll entry for the actor's spell effects; false when one of them cancelled the roll. */
export function runSpellRollEntry<N extends SpellRollEntryName>(
  actor: RqgActor | null | undefined,
  name: N,
  args: EntryArgs<N>,
): boolean {
  if (!actor) {
    return true;
  }
  const groups = groupEffectsByHook(
    actor.allApplicableEffects() as Iterable<ActiveEffect & { active: boolean }>,
    (effect) => spellBehaviourForEffect(effect)?.[name],
  );
  for (const [entry, effects] of groups) {
    if ((entry as (scope: unknown) => boolean | void)({ ...args, effects }) === false) {
      return false;
    }
  }
  return true;
}

/** Spell effects react to rolls through their behaviour, not their own hook listeners (#1170). */
export function initSpellRollEntries(): void {
  onRqgHook("rqg.preAbilityRoll", (item, options) =>
    runSpellRollEntry(item.actor as RqgActor | null, "onPreAbilityRoll", { item, options }),
  );
  onRqgHook("rqg.preCharacteristicRoll", (actor, options) =>
    runSpellRollEntry(actor, "onPreCharacteristicRoll", { actor, options }),
  );
  onRqgHook("rqg.preSpellCast", (spell, caster, options) =>
    runSpellRollEntry(caster, "onPreSpellCast", { spell, caster, options }),
  );
  onRqgHook("rqg.preAttack", (weapon, attack) =>
    runSpellRollEntry(attack.attacker, "onPreAttack", { weapon, attack }),
  );
  onRqgHook("rqg.preDefence", (defender, defence) =>
    runSpellRollEntry(defender, "onPreDefence", { defender, defence }),
  );
}
