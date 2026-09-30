import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";

/** Which spell effects to remove. Every given field must match; an empty filter matches them all. */
export type SpellEffectRemovalFilter = {
  spellRqid?: string;
  casterUuid?: string;
  maxLevel?: number;
};

type SpellProvenance = { spellRqid?: string; casterUuid?: string; level?: number };

export function matchesSpellEffectRemovalFilter(
  spell: SpellProvenance,
  filter: SpellEffectRemovalFilter,
): boolean {
  return (
    (filter.spellRqid === undefined || spell.spellRqid === filter.spellRqid) &&
    (filter.casterUuid === undefined || spell.casterUuid === filter.casterUuid) &&
    (filter.maxLevel === undefined || (spell.level ?? 0) <= filter.maxLevel)
  );
}

/**
 * Remove the spell effects on an actor and its items that match the filter, one delete per parent
 * document. Only effects a cast created (they carry `system.spell`) are touched. Run on a client that
 * owns the target. Returns the removed effects.
 */
export async function removeSpellEffects(
  targetActor: RqgActor,
  filter: SpellEffectRemovalFilter = {},
): Promise<ActiveEffect[]> {
  const parents: (RqgActor | RqgItem)[] = [
    targetActor,
    ...(targetActor.items.contents as RqgItem[]),
  ];
  const removed: ActiveEffect[] = [];
  for (const parent of parents) {
    const matching = parent.effects.contents.filter((effect: any) => {
      const spell = effect.system?.spell as SpellProvenance | null | undefined;
      return !!spell && matchesSpellEffectRemovalFilter(spell, filter);
    });
    if (matching.length) {
      await (parent as RqgItem).deleteEmbeddedDocuments(
        "ActiveEffect",
        matching.map((effect) => effect.id ?? ""),
      );
      removed.push(...(matching as ActiveEffect[]));
    }
  }
  return removed;
}
