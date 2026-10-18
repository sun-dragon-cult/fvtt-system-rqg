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
  /** Whether it takes effect by itself, through its changes or its spell's behavior. */
  automatic: boolean;
  /** What the effect leaves to the GM, as plain text. */
  description: string;
};

type EffectLike = {
  uuid: string;
  name: string;
  img: string | null;
  parent: unknown;
  active: boolean;
  isTemporary: boolean;
  duration: { label?: string };
  description?: string | null;
  system?: { changes?: readonly unknown[] };
};

/**
 * The Token HUD entries for an actor's spell effects (see listSpellEffects). `actsWhileActive`
 * tells whether the spell's behavior acts on an effect while it's on.
 */
export function spellEffectHudEntries<E extends EffectLike>(
  effects: Iterable<E>,
  actor: unknown,
  actsWhileActive: (effect: E) => boolean = () => false,
): SpellEffectHudEntry[] {
  return [...effects]
    .map((effect) => ({
      uuid: effect.uuid,
      name: effect.name,
      img: effect.img ?? "",
      itemName: effect.parent !== actor ? ((effect.parent as { name?: string })?.name ?? "") : "",
      remaining: effect.isTemporary ? (effect.duration.label ?? "") : "",
      active: effect.active,
      automatic: !!effect.system?.changes?.length || actsWhileActive(effect),
      description: plainText(effect.description ?? ""),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
