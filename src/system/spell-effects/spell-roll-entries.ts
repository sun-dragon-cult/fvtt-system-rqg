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

/**
 * Run a roll entry for the actor's spell effects, and for `extraEffects`, such as the spells on the
 * weapon that makes the attack.
 */
export function runSpellRollEntry<N extends SpellRollEntryName>(
  actor: RqgActor | null | undefined,
  name: N,
  args: EntryArgs<N>,
  extraEffects: Iterable<ActiveEffect> = [],
): void {
  if (!actor) {
    return;
  }
  const effects = new Set<ActiveEffect>([...actor.allApplicableEffects(), ...extraEffects]);
  const groups = groupEffectsByHook(
    effects as Iterable<ActiveEffect & { active: boolean }>,
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
  onRqgHook("rqg.prepareAttack", (weapon, attack, preparation) => {
    // The spells on the weapon and the missile act on its attacks too, e.g. Sureshot
    const weaponEffects = [weapon, attack.projectile]
      .filter((item, i, items) => item && items.indexOf(item) === i)
      .flatMap((item) => [...(item?.effects ?? [])]);
    runSpellRollEntry(
      attack.attacker,
      "onPrepareAttack",
      { weapon, attack, preparation },
      weaponEffects,
    );
  });
  onRqgHook("rqg.prepareDefence", (defender, defence, preparation) =>
    runSpellRollEntry(defender, "onPrepareDefence", { defender, defence, preparation }),
  );
}
