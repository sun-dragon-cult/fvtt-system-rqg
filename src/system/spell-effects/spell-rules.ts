import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";

type CastPoints = { magicPointsSpent?: number; runePointsSpent?: number };
type SpellProvenance = { level?: number; runePointsSpent?: number };

/**
 * A cast's strength against defences: magic points as they are, Rune points double, so a 1-point
 * Rune spell boosted with 5 magic points is a 7-point spell (RBM Q&A on Heal Wound).
 */
export function castStrength(cast: CastPoints): number {
  return (cast.magicPointsSpent ?? 0) + 2 * (cast.runePointsSpent ?? 0);
}

/**
 * Dispel Magic points needed to remove a spell effect: 1 per point of spirit magic, 2 per Rune
 * point, boosts not counted (RBM p.112). Spells that count in Dismiss Magic points (RBM p.44)
 * double their own budget instead.
 */
export function effectRemovalCost(effect: { system?: unknown }): number {
  const spell = (effect.system as { spell?: SpellProvenance | null } | undefined)?.spell;
  const level = spell?.level ?? 0;
  return (spell?.runePointsSpent ?? 0) > 0 ? level * 2 : level;
}

/** The spell effects on an actor and its items that haven't expired. */
export function listSpellEffects(actor: RqgActor): ActiveEffect[] {
  const parents: (RqgActor | RqgItem)[] = [actor, ...(actor.items.contents as RqgItem[])];
  return parents.flatMap((parent) =>
    (parent.effects.contents as ActiveEffect[]).filter(
      (effect: any) => !!effect.system?.spell && !effect.duration?.expired,
    ),
  );
}
