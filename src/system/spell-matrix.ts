import type { RqgActor } from "@actors/rqg-actor.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { RqgItem } from "../items/rqg-item";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { Rqid } from "./api/rqid-api";
import { isDocumentSubType, localize } from "./util";

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
 * one getMatrixSpellSources call, or one item sheet render), so entries pointing at the same rqid
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

/** One resolved Spell Matrix entry within a MatrixSpellSource group - `entryIndex` identifies
 *  which array entry on `sourceItem.system.matrixSpells` this resolved from (needed to cast the
 *  right one, since an item can hold more than one matrix spell). */
export type MatrixSpellEntry = {
  entryIndex: number;
  item: SpiritMagicItem;
};

/** One item's Spell Matrix Enchantment(s) (#959), resolved for display under its own
 *  "From {itemName}:" group in the Spirit Magic tab - see actor-sheet-v2-spirit-magic.hbs.
 *  Grouped by `sourceItem` the same way getBoundSpiritSpiritMagicItems groups by bound spirit
 *  (spell-source.ts), so an item holding more than one matrix spell gets one divider with all its
 *  entries listed underneath, not a repeated divider per entry. */
export type MatrixSpellSource = {
  sourceItem: PhysicalItem;
  entries: MatrixSpellEntry[];
};

/**
 * Every enchanted Spell Matrix item among the actor's own physical items, one group per item, each
 * resolved to its entries' live SpiritMagicItems (see resolveMatrixSpellItem). Anyone in physical
 * contact with the item could cast it, but for sheet display purposes this only looks at the
 * viewing actor's own items - items on other actors are out of scope here. Entries whose spell
 * can't be resolved (already warned about by resolveMatrixSpellItem) are omitted; items left with
 * no resolvable entries are omitted entirely.
 */
export async function getMatrixSpellSources(actor: RqgActor): Promise<MatrixSpellSource[]> {
  const matrixItems = actor.items.filter(
    (i) =>
      isDocumentSubType<PhysicalItem>(i, physicalItemTypes) &&
      (i.system.matrixSpells?.length ?? 0) > 0,
  ) as PhysicalItem[];

  // Shared across every entry resolved below, so items/entries enchanted with the same spell
  // (e.g. two matrices both holding Bladesharp) only resolve that spell's canonical rqid once.
  const canonicalCache = new Map<string, Promise<RqgItem | undefined>>();

  const sources = await Promise.all(
    matrixItems.map(async (sourceItem) => {
      const spellEntries = sourceItem.system.matrixSpells ?? [];
      const resolved = await Promise.all(
        spellEntries.map(async (_entry, entryIndex) => {
          const item = await resolveMatrixSpellItem(sourceItem, entryIndex, canonicalCache);
          return item ? { entryIndex, item } : undefined;
        }),
      );
      return {
        sourceItem,
        entries: resolved.filter((entry): entry is MatrixSpellEntry => entry != null),
      };
    }),
  );
  return sources.filter((source) => source.entries.length > 0);
}
