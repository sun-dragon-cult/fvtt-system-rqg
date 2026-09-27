import type {
  SpellEffectBlockedReason,
  SpellStackingRule,
} from "../../active-effect/data-model/spell-effect.defs";

/** A spell effect already on the document a new one would be parented to. */
export type ExistingSpellEffect = {
  id: string;
  name: string;
  spellRqid: string;
  level: number;
  incompatibleSpellRqids: readonly string[];
  expired: boolean;
};

export type SpellEffectStacking =
  | { outcome: "apply"; displaced: ExistingSpellEffect[] }
  | { outcome: "blocked"; reason: SpellEffectBlockedReason; by: ExistingSpellEffect };

/** Whether a new cast lands on its target document, and which existing spell effects it removes. */
export function decideSpellEffectStacking(
  cast: { spellRqid: string; level: number; incompatibleSpellRqids: readonly string[] },
  existing: readonly ExistingSpellEffect[],
  rule: SpellStackingRule,
): SpellEffectStacking {
  // a spell without an rqid can't be told apart from another, so it always stacks
  const sameSpell = (effect: ExistingSpellEffect) =>
    !!cast.spellRqid && effect.spellRqid === cast.spellRqid;
  const incompatible = (effect: ExistingSpellEffect) =>
    !sameSpell(effect) &&
    ((!!effect.spellRqid && cast.incompatibleSpellRqids.includes(effect.spellRqid)) ||
      (!!cast.spellRqid && effect.incompatibleSpellRqids.includes(cast.spellRqid)));

  const conflicts = existing.filter((effect) => sameSpell(effect) || incompatible(effect));
  if (rule === "strongestTakesEffect") {
    const active = conflicts.filter((effect) => !effect.expired);
    const stronger = active.find((effect) => sameSpell(effect) && effect.level >= cast.level);
    if (stronger) {
      return { outcome: "blocked", reason: "strongerActive", by: stronger };
    }
    const incompatibleActive = active.find(incompatible);
    if (incompatibleActive) {
      return { outcome: "blocked", reason: "incompatibleActive", by: incompatibleActive };
    }
  }
  return { outcome: "apply", displaced: conflicts };
}
