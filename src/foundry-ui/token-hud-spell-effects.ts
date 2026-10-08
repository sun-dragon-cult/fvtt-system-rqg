/** What the Token HUD needs to show one applied spell effect. */
export type SpellEffectHudEntry = {
  uuid: string;
  name: string;
  img: string;
  /** The item it's on, "" when it's on the actor itself. */
  itemName: string;
  /** Time left, "" when it doesn't expire. */
  remaining: string;
  active: boolean;
};

type EffectLike = {
  uuid: string;
  name: string;
  img: string | null;
  parent: unknown;
  active: boolean;
  isTemporary: boolean;
  duration: { label?: string };
};

/** The Token HUD entries for an actor's spell effects (see listSpellEffects). */
export function spellEffectHudEntries(
  effects: Iterable<EffectLike>,
  actor: unknown,
): SpellEffectHudEntry[] {
  return [...effects]
    .map((effect) => ({
      uuid: effect.uuid,
      name: effect.name,
      img: effect.img ?? "",
      itemName: effect.parent !== actor ? ((effect.parent as { name?: string })?.name ?? "") : "",
      remaining: effect.isTemporary ? (effect.duration.label ?? "") : "",
      active: effect.active,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
