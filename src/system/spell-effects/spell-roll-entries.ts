import type { RqgActor } from "@actors/rqg-actor.ts";
import { onRqgHook } from "../fvtt-type-compat";
import { groupEffectsByHook } from "./incoming-spell";
import {
  spellBehaviorForEffect,
  type SpellRollEntries,
  type SpellRollEntryName,
} from "./spell-behavior";

type EntryArgs<N extends SpellRollEntryName> = Omit<
  Parameters<NonNullable<SpellRollEntries[N]>>[0],
  "effects"
>;

/** Run a roll entry for the actor's spell effects. */
export function runSpellRollEntry<N extends SpellRollEntryName>(
  actor: RqgActor | null | undefined,
  name: N,
  args: EntryArgs<N>,
): void {
  if (!actor) {
    return;
  }
  const groups = groupEffectsByHook(
    actor.allApplicableEffects() as Iterable<ActiveEffect & { active: boolean }>,
    (effect) => spellBehaviorForEffect(effect)?.[name],
  );
  for (const [entry, effects] of groups) {
    (entry as (scope: unknown) => void)({ ...args, effects });
  }
}

/** Spell effects react to rolls through their behavior, not their own hook listeners (#1170). */
export function initSpellRollEntries(): void {
  onRqgHook("rqg.prepareAbilityRoll", (item, options, preparation) =>
    runSpellRollEntry(item.actor as RqgActor | null, "onPrepareAbilityRoll", {
      item,
      options,
      preparation,
    }),
  );
  onRqgHook("rqg.prepareCharacteristicRoll", (actor, options, preparation) =>
    runSpellRollEntry(actor, "onPrepareCharacteristicRoll", { actor, options, preparation }),
  );
  onRqgHook("rqg.prepareSpellCast", (spell, caster, options, preparation) =>
    runSpellRollEntry(caster, "onPrepareSpellCast", { spell, caster, options, preparation }),
  );
  onRqgHook("rqg.prepareAttack", (weapon, attack, preparation) =>
    runSpellRollEntry(attack.attacker, "onPrepareAttack", { weapon, attack, preparation }),
  );
  onRqgHook("rqg.prepareDefence", (defender, defence, preparation) =>
    runSpellRollEntry(defender, "onPrepareDefence", { defender, defence, preparation }),
  );
}
