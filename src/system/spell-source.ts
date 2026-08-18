import type { RqgActor } from "@actors/rqg-actor.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import {
  type BoundSpiritCandidate,
  getAlliedBondActor,
  getBoundSpiritItems,
} from "./magic-point-source";
import { getAlliedCultItem } from "./rune-point-source";

/**
 * Spirit/Rune Magic spells the actor doesn't know itself, but can cast anyway because Core p.277's
 * Allied Spirit bond shares spell knowledge (not just Magic/Rune Points, #957) with a linked bond
 * partner (#1002, either direction - see getAlliedBondActor). Named generically ("external", not
 * "allied") since a future spell source (e.g. a Matrix item) could plausibly grant spells the same
 * way without being a bonded actor at all - callers shouldn't need to know or care which kind of
 * external source it is.
 */

/**
 * The linked Allied Spirit bond partner's known Spirit Magic spells (#1002), in the same sort
 * order as the caster's own `embeddedItems.spiritMagic`. Empty when there's no usable bond partner
 * (see getAlliedBondActor) - never merged into the actor's own Item collection, so it disappears
 * immediately if the bond is unlinked.
 *
 * Accepts an already-resolved `ally` (e.g. from a caller that also needs it for something else,
 * like the sheet's header display) to avoid re-resolving the allied bond a second time -
 * getBondedPriest's reverse-lookup side in particular walks game.actors.contents.
 */
export function getExternalSpiritMagicItems(
  actor: RqgActor,
  ally: RqgActor | undefined = getAlliedBondActor(actor),
): SpiritMagicItem[] {
  if (!ally) {
    return [];
  }
  return (ally.items.filter((i) => i.type === ItemTypeEnum.SpiritMagic) as SpiritMagicItem[]).sort(
    (a, b) => a.sort - b.sort,
  );
}

/** One bound spirit's known Spirit Magic spells, for display under its own "From {spiritName} in
 *  {itemName}:" divider - see getBoundSpiritSpiritMagicItems. */
export type ExternalSpiritMagicSource = {
  sourceActor: RqgActor;
  sourceItem: PhysicalItem;
  items: SpiritMagicItem[];
};

/**
 * Spirit Magic spells known by each of the actor's bound spirits (#999), one group per usable
 * spirit (an actor can have more than one). A spirit bound into more than one item is only listed
 * once. Empty groups are omitted.
 *
 * Accepts an already-resolved `boundSpirits` list - see getBoundSpiritItems.
 */
export function getBoundSpiritSpiritMagicItems(
  actor: RqgActor,
  boundSpirits: BoundSpiritCandidate[] = getBoundSpiritItems(actor),
): ExternalSpiritMagicSource[] {
  const candidatesByUuid = new Map<string, BoundSpiritCandidate>();
  for (const candidate of boundSpirits) {
    if (candidate.spiritActor.uuid && !candidatesByUuid.has(candidate.spiritActor.uuid)) {
      candidatesByUuid.set(candidate.spiritActor.uuid, candidate);
    }
  }
  return [...candidatesByUuid.values()]
    .map(({ item, spiritActor }) => ({
      sourceActor: spiritActor,
      sourceItem: item,
      items: (
        spiritActor.items.filter((i) => i.type === ItemTypeEnum.SpiritMagic) as SpiritMagicItem[]
      ).sort((a, b) => a.sort - b.sort),
    }))
    .filter((source) => source.items.length > 0);
}

/**
 * The linked Allied Spirit bond partner's known Rune Magic spells (#1002) for the *same* cult as
 * `cult` (matched by rqid, via getAlliedCultItem - the same match already used for Rune Point
 * sharing, #957). Empty when there's no bond partner or the bond partner isn't initiated to a
 * matching cult - a priest's cult tab with no Allied Spirit counterpart just shows nothing extra,
 * per #1002's design (a rare edge case, not the common path to design around).
 *
 * Accepts an already-resolved `ally` - see getExternalSpiritMagicItems above.
 */
export function getExternalRuneMagicItems(
  actor: RqgActor,
  cult: CultItem,
  ally: RqgActor | undefined = getAlliedBondActor(actor),
): RuneMagicItem[] {
  const allied = getAlliedCultItem(actor, cult, ally);
  if (!allied) {
    return [];
  }
  return (
    allied.actor.items.filter(
      (i) =>
        i.type === ItemTypeEnum.RuneMagic && (i as RuneMagicItem).system.cultId === allied.cult.id,
    ) as RuneMagicItem[]
  ).sort((a, b) => a.sort - b.sort);
}
