import type { RqgItem } from "@items/rqg-item.ts";
import type { SpellEffectCast } from "./apply-spell-effect";
import { actorRefUuid } from "../../data-model/shared/actor-ref";
import { guardSpellBehavior } from "./spell-behavior";
import type { SpellAcrossRegionScope } from "./spell-area";
import type { SpellAreaRegionBehavior } from "../../scene/spell-area-region-behavior";

type AreaToken = { regions?: Set<RegionDocument> | null };

type AcrossHandler = (scope: SpellAcrossRegionScope) => Promise<void>;

/** The behaviors of a Region that want to know about spells cast across it. */
function acrossBehaviors(region: RegionDocument): RegionBehavior[] {
  return Array.from(region.behaviors ?? []).filter(
    (behavior: RegionBehavior) =>
      !behavior.disabled && typeof (behavior.system as any)?.onSpellAcross === "function",
  );
}

/**
 * The Regions a spell cast at `targets` crosses: those holding a target but not the caster, with a
 * behavior that has an `onSpellAcross`.
 */
export function crossedAreas<T extends AreaToken>(
  caster: AreaToken | undefined,
  targets: readonly T[],
): Map<RegionDocument, T[]> {
  const crossed = new Map<RegionDocument, T[]>();
  for (const target of targets) {
    for (const region of target.regions ?? []) {
      if (caster?.regions?.has(region) || !acrossBehaviors(region).length) {
        continue;
      }
      crossed.set(region, [...(crossed.get(region) ?? []), target]);
    }
  }
  return crossed;
}

/** The Region's spell area behavior, if it is a spell area. */
export function spellAreaBehavior(region: RegionDocument): SpellAreaRegionBehavior | undefined {
  const behavior = region.behaviors?.find((b: { type: string }) => b.type === "spellArea");
  return behavior?.system as unknown as SpellAreaRegionBehavior | undefined;
}

/** A token, or an actor's token: its own if synthetic, else its first on the viewed scene. */
export function tokenOfDocument(document: unknown): TokenDocument | undefined {
  if (document instanceof TokenDocument) {
    return document;
  }
  const actor = document as Actor | null | undefined;
  return (actor?.isToken ? actor.token : actor?.getActiveTokens?.(false, true)[0]) as
    TokenDocument | undefined;
}

export function tokenOfUuid(uuid: string): TokenDocument | undefined {
  return tokenOfDocument(uuid ? fromUuidSync(uuid) : null);
}

/**
 * Run `onSpellAcross` of every behavior of every Region the spell crosses on its way from its
 * caster to its targets, once per behavior. On the active GM's client, as the cast meets its
 * targets' defenses.
 */
export async function castAcrossSpellAreas(
  spell: RqgItem,
  cast: SpellEffectCast,
  targetUuids: readonly string[],
): Promise<void> {
  const targets = targetUuids.flatMap((uuid) => tokenOfUuid(uuid) ?? []);
  for (const [region, crossedTargets] of crossedAreas(
    tokenOfUuid(actorRefUuid(cast.caster)),
    targets,
  )) {
    for (const behavior of acrossBehaviors(region)) {
      await guardSpellBehavior(region.name ?? "", () =>
        (behavior.system as unknown as { onSpellAcross: AcrossHandler }).onSpellAcross({
          region: region,
          behavior: behavior,
          incomingSpell: spell,
          incomingCast: cast,
          targets: crossedTargets,
        }),
      );
    }
  }
}
