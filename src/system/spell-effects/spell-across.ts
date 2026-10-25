import type { RqgItem } from "@items/rqg-item.ts";
import type { SpellEffectCast } from "./apply-spell-effect";

type AreaToken = { regions?: Set<RegionDocument> | null };

/** The spell areas a spell cast at `targets` crosses: those holding a target but not the caster. */
export function crossedAreas<T extends AreaToken>(
  caster: AreaToken | undefined,
  targets: readonly T[],
): Map<RegionDocument, T[]> {
  const crossed = new Map<RegionDocument, T[]>();
  for (const target of targets) {
    for (const region of target.regions ?? []) {
      if (caster?.regions?.has(region) || !spellAreaOf(region)) {
        continue;
      }
      crossed.set(region, [...(crossed.get(region) ?? []), target]);
    }
  }
  return crossed;
}

type SpellAcrossRunner = {
  spellAcross(spell: RqgItem, cast: SpellEffectCast, targets: TokenDocument[]): Promise<void>;
};

function spellAreaOf(region: RegionDocument): SpellAcrossRunner | undefined {
  const behavior = region.behaviors?.find((b: { type: string }) => b.type === "spellArea");
  return behavior?.system as unknown as SpellAcrossRunner | undefined;
}

function tokenOf(uuid: string): TokenDocument | undefined {
  const document = uuid ? fromUuidSync(uuid) : null;
  return document instanceof TokenDocument
    ? document
    : ((document as Actor | null)?.getActiveTokens?.(false, true)[0] as TokenDocument | undefined);
}

/**
 * Run `onSpellAcross` of every spell area the spell crosses on its way from its caster to its
 * targets, once per area. On the active GM's client, as the cast meets its targets' defences.
 */
export async function castAcrossSpellAreas(
  spell: RqgItem,
  cast: SpellEffectCast,
  targetUuids: readonly string[],
): Promise<void> {
  const targets = targetUuids.flatMap((uuid) => tokenOf(uuid) ?? []);
  for (const [region, crossedTargets] of crossedAreas(tokenOf(cast.casterUuid), targets)) {
    await spellAreaOf(region)?.spellAcross(spell, cast, crossedTargets);
  }
}
