import type { ItemMigration } from "../apply-migrations";
import type { RqgItem } from "@items/rqg-item.ts";
import { normalizeLegacyActiveEffectDuration } from "../shared-ae-duration-migration-utils";

/**
 * ItemMigration: Normalize legacy ActiveEffect duration data to v14 unit-based shape.
 */
export const migrateItemActiveEffectDurationUnits: ItemMigration = async (
  item: RqgItem,
  owningActor,
  logger,
): Promise<Item.UpdateData> => {
  const updateData: Item.UpdateData = {};
  const rawEffects = (item as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  if (originalEffects.length === 0) {
    return updateData;
  }

  const effectUpdates = originalEffects.flatMap((effect) => {
    const normalized = normalizeLegacyActiveEffectDuration(effect);
    if (!normalized) {
      return [];
    }

    const effectRecord = effect as Record<string, unknown>;
    const effectId = effectRecord["_id"] ?? effectRecord["id"];
    if (typeof effectId !== "string") {
      return [];
    }

    return [
      {
        _id: effectId,
        duration: normalized.duration,
        start: normalized.start,
      },
    ];
  });

  if (effectUpdates.length > 0) {
    updateData.effects = effectUpdates as any;
    logger?.info(`Migrated AE duration units on item ${item.name}`, {
      notify: false,
      documents: [{ kind: "Item", uuid: item.uuid, label: item.name }],
    });
  }

  return updateData;
};
