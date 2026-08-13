import type { ItemMigration } from "../apply-migrations";
import type { RqgItem } from "@items/rqg-item.ts";
import { physicalItemTypes } from "@item-model/i-physical-item.ts";
import type { PhysicalItem } from "@item-model/item-types.ts";
import { isDocumentSubType } from "../../util";
import {
  type AEMigrationEffectLike,
  getCollectionValues,
  getEffectChanges,
} from "../shared-ae-migration-utils";

const MAGIC_POINT_EFFECT_KEY = "system.effect.add.magicPoints.max";

/**
 * ItemMigration: replace the old "POW crystal" hack with the item's own storedMagicPoints field.
 *
 * BG: #160 discussed POW-storing crystals and #956 formalized the fix. Before this, a crystal
 * was just an Active Effect adding directly to system.effect.add.magicPoints.max, which merges
 * the crystal's points into the owner's own MP max rather than keeping them as a separate,
 * selectable pool. This migration sums any such changes on an item's own effects into
 * system.storedMagicPoints (treated as fully charged, since the old mechanism had no notion of a
 * partially-spent crystal) and strips the migrated change entries from the source effect(s).
 */
export const migrateItemPowCrystalToStoredMagicPoints: ItemMigration = async (
  item: RqgItem,
  owningActor,
  logger,
): Promise<Item.UpdateData> => {
  const updateData: Item.UpdateData = {};

  if (!isDocumentSubType<PhysicalItem>(item, physicalItemTypes)) {
    return updateData; // Only physical items (gear/weapon/armor) can carry storedMagicPoints
  }
  if ((item.system as any).storedMagicPoints?.max) {
    return updateData; // Already has a stored value - don't clobber it
  }

  const effects = getCollectionValues<AEMigrationEffectLike>((item as any).effects);

  let total = 0;
  const effectUpdates: any[] = [];
  for (const effect of effects) {
    const changes = getEffectChanges(effect);
    const matchingChanges = changes.filter((c) => c.key === MAGIC_POINT_EFFECT_KEY);
    if (matchingChanges.length === 0) {
      continue;
    }

    total += matchingChanges.reduce((sum, c) => sum + (Number(c.value) || 0), 0);

    const effectId = effect._id ?? effect.id;
    if (effectId) {
      effectUpdates.push({
        _id: effectId,
        system: { changes: changes.filter((c) => c.key !== MAGIC_POINT_EFFECT_KEY) },
      });
    }
  }

  if (total <= 0) {
    return updateData;
  }

  // Already known and functional under the old always-active mechanism, so migrating shouldn't
  // suddenly hide it behind the new identified/attuned gates (see #956 follow-up) - default
  // attunedTo to the owning actor's name unless it's already attuned to something else.
  const existingAttunedTo = (item.system as any).attunedTo as string | undefined;
  const attunedTo = existingAttunedTo?.trim() ? existingAttunedTo : (owningActor?.name ?? "");

  updateData.system = {
    storedMagicPoints: { value: total, max: total, identified: true },
    attunedTo,
  } as any;
  if (effectUpdates.length > 0) {
    updateData.effects = effectUpdates as any;
  }

  logger?.info(
    `Migrated POW crystal Active Effect on item ${item.name} to storedMagicPoints (${total} MP)`,
    {
      notify: false,
      documents: [{ kind: "Item", uuid: item.uuid, label: item.name }],
    },
  );

  return updateData;
};
