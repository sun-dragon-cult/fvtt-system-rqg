import type { RqgActor } from "@actors/rqg-actor.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { RqgItem } from "../items/rqg-item";
import type { RqidLink } from "../data-model/shared/rqid-link";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { Rqid } from "./api/rqid-api";
import { isDocumentSubType, localize } from "./util";

/** One stored Spell Matrix entry (#959). `sort` orders it among the actor's own spells (#1047). */
export type MatrixSpellStorageEntry = { spellRqidLink: RqidLink; points: number; sort: number };

/**
 * Resolve one Spirit Magic spell stored in a Spell Matrix Enchantment (Core p.264-265, #959) into
 * a real, but transient and unembedded, SpiritMagicItem - built fresh from the canonical rqid
 * document (world override or compendium, via Rqid.fromRqid) each time it's needed, with `points`
 * overridden to the level actually enchanted into that matrix entry. Never persisted: Foundry Items
 * can't be embedded on other Items, so the matrix only stores an array of `{spellRqidLink, points}`
 * entries (physical-item-schema-fields.ts) and this rebuilds the rest (range/duration/
 * concentration/isVariable/...) on demand instead of duplicating it there.
 *
 * Returns undefined (and warns) if the entry doesn't exist or has no spell set, or the rqid can't
 * be resolved - e.g. the wiki-rqg compendium isn't installed, or the spell's rqid was renamed
 * upstream.
 *
 * The returned item is never embedded/persisted anywhere (`.isEmbedded` is false), so its `.uuid`
 * isn't resolvable via fromUuid - callers that need it to survive a round-trip through a form
 * submission (e.g. SpiritMagicRollDialogV2's onSubmit) can't rely on the uuid for that; see
 * spellItemJson there for the fallback (same "unpersisted item survives as JSON" idiom already used
 * for Reputation's PartialAbilityItem in ability-roll-dialog-v2.ts).
 *
 * Accepts an optional `canonicalCache`, shared across sibling calls (e.g. every entry resolved by
 * one getMatrixSpellRows call, or one item sheet render), so entries pointing at the same rqid
 * - a common case, e.g. two matrices both enchanted with Bladesharp - only pay Rqid.fromRqid's
 * world/compendium lookup once instead of once per entry.
 */
export async function resolveMatrixSpellItem(
  item: PhysicalItem,
  entryIndex: number,
  canonicalCache?: Map<string, Promise<RqgItem | undefined>>,
): Promise<SpiritMagicItem | undefined> {
  const matrixSpell = item.system.matrixSpells?.[entryIndex];
  const rqid = matrixSpell?.spellRqidLink?.rqid;
  if (!rqid) {
    return undefined;
  }

  let canonicalPromise = canonicalCache?.get(rqid);
  if (!canonicalPromise) {
    canonicalPromise = Rqid.fromRqid<any>(rqid) as Promise<RqgItem | undefined>;
    canonicalCache?.set(rqid, canonicalPromise);
  }
  const canonical = await canonicalPromise;
  if (!isDocumentSubType<SpiritMagicItem>(canonical, ItemTypeEnum.SpiritMagic)) {
    ui.notifications?.warn(
      localize("RQG.Item.Gear.MatrixSpellNotFoundWarn", {
        rqid: rqid,
        name: matrixSpell?.spellRqidLink?.name ?? rqid,
      }),
    );
    return undefined;
  }

  const data = foundry.utils.mergeObject(canonical.toObject(false), {
    system: { points: matrixSpell.points },
  });
  return new CONFIG.Item.documentClass(data) as unknown as SpiritMagicItem;
}

/** Actor's equipped items holding at least one Spell Matrix entry (#959). */
function getEquippedMatrixItems(actor: RqgActor): PhysicalItem[] {
  return actor.items.filter(
    (i) =>
      isDocumentSubType<PhysicalItem>(i, physicalItemTypes) &&
      (i.system.matrixSpells?.length ?? 0) > 0 &&
      i.system.equippedStatus === "equipped",
  ) as PhysicalItem[];
}

/** A matrix entry's sort/name, read directly off storage - no Rqid resolution. Use
 *  getMatrixSpellRows instead when the resolved SpiritMagicItem is actually needed (#1047). */
export type MatrixSpellSlot = {
  sourceItem: PhysicalItem;
  entryIndex: number;
  sort: number;
  name: string;
};

/** Every Spell Matrix entry's sort/name, unresolved - see MatrixSpellSlot. */
export function getMatrixSpellSlots(actor: RqgActor): MatrixSpellSlot[] {
  return getEquippedMatrixItems(actor).flatMap((sourceItem) =>
    (sourceItem.system.matrixSpells ?? []).map((entry, entryIndex) => ({
      sourceItem,
      entryIndex,
      sort: entry.sort ?? 0,
      name: entry.spellRqidLink?.name ?? "",
    })),
  );
}

/** One Spell Matrix entry (#959), resolved to its live SpiritMagicItem. */
export type MatrixSpellRow = {
  sourceItem: PhysicalItem;
  entryIndex: number;
  item: SpiritMagicItem;
  sort: number;
};

/** Every Spell Matrix spell across the actor's equipped items, resolved and flattened (#1047 -
 *  listed alongside owned spells, not grouped by item). */
export async function getMatrixSpellRows(actor: RqgActor): Promise<MatrixSpellRow[]> {
  const matrixItems = getEquippedMatrixItems(actor);

  // Shared across every entry resolved below, so items/entries enchanted with the same spell
  // (e.g. two matrices both holding Bladesharp) only resolve that spell's canonical rqid once.
  const canonicalCache = new Map<string, Promise<RqgItem | undefined>>();

  const rows = await Promise.all(
    matrixItems.map(async (sourceItem) => {
      const spellEntries = sourceItem.system.matrixSpells ?? [];
      const resolved = await Promise.all(
        spellEntries.map(async (entry, entryIndex) => {
          const item = await resolveMatrixSpellItem(sourceItem, entryIndex, canonicalCache);
          return item ? { sourceItem, entryIndex, item, sort: entry.sort ?? 0 } : undefined;
        }),
      );
      return resolved.filter((row): row is MatrixSpellRow => row != null);
    }),
  );
  return rows.flat();
}

/** Sort value for a newly-enchanted matrix entry: past everything else, so it appends at the
 *  end (#1047). 0 when there's no actor yet. */
export function getNextSpiritMagicSort(actor: RqgActor | null | undefined): number {
  if (!actor) {
    return 0;
  }
  const ownedSorts = actor.items
    .filter((i) => i.type === ItemTypeEnum.SpiritMagic)
    .map((i) => i.sort ?? 0);
  const matrixSorts = getMatrixSpellSlots(actor).map((slot) => slot.sort);
  return Math.max(0, ...ownedSorts, ...matrixSorts) + CONST.SORT_INTEGER_DENSITY;
}
