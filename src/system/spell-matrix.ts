import type { RqgActor } from "@actors/rqg-actor.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { RqgItem } from "../items/rqg-item";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { Rqid } from "./api/rqid-api";
import { isDocumentSubType, localize } from "./util";

/**
 * Resolve the Spirit Magic spell stored in a Spell Matrix Enchantment (Core p.264-265, #959) into
 * a real, but transient and unembedded, SpiritMagicItem - built fresh from the canonical rqid
 * document (world override or compendium, via Rqid.fromRqid) each time it's needed, with `points`
 * overridden to the level actually enchanted into the matrix. Never persisted: Foundry Items can't
 * be embedded on other Items, so the matrix only stores `{spellRqidLink, points}`
 * (physical-item-schema-fields.ts) and this rebuilds the rest (range/duration/concentration/
 * isVariable/...) on demand instead of duplicating it there.
 *
 * Returns undefined (and warns) if the item has no matrix spell set, or the rqid can't be resolved
 * - e.g. the wiki-rqg compendium isn't installed, or the spell's rqid was renamed upstream.
 */
export async function resolveMatrixSpellItem(
  item: PhysicalItem,
): Promise<SpiritMagicItem | undefined> {
  const matrixSpell = item.system.matrixSpell;
  const rqid = matrixSpell?.spellRqidLink?.rqid;
  if (!rqid) {
    return undefined;
  }

  const canonical = (await Rqid.fromRqid<any>(rqid)) as RqgItem | undefined;
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

/** One Spell Matrix Enchantment (#959) the actor is carrying, resolved for display in the Spirit
 *  Magic tab's "From {itemName}:" group - see actor-sheet-v2-spirit-magic.hbs. Grouped by
 *  `sourceItem` the same way getBoundSpiritSpiritMagicItems groups by bound spirit (spell-source.ts),
 *  even though a matrix only ever holds a single spell. */
export type MatrixSpellSource = {
  sourceItem: PhysicalItem;
  item: SpiritMagicItem;
};

/**
 * Every enchanted Spell Matrix among the actor's own physical items, resolved to its live
 * SpiritMagicItem (see resolveMatrixSpellItem). Anyone in physical contact with the item could
 * cast it, but for sheet display purposes this only looks at the viewing actor's own items -
 * items on other actors are out of scope here. Entries whose spell can't be resolved (already
 * warned about by resolveMatrixSpellItem) are omitted.
 */
export async function getMatrixSpellSources(actor: RqgActor): Promise<MatrixSpellSource[]> {
  const matrixItems = actor.items.filter(
    (i) =>
      isDocumentSubType<PhysicalItem>(i, physicalItemTypes) &&
      !!i.system.matrixSpell?.spellRqidLink?.rqid,
  ) as PhysicalItem[];

  const resolved = await Promise.all(
    matrixItems.map(async (sourceItem) => {
      const item = await resolveMatrixSpellItem(sourceItem);
      return item ? { sourceItem, item } : undefined;
    }),
  );
  return resolved.filter((source): source is MatrixSpellSource => source != null);
}
