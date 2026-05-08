import type { ItemMigration } from "../applyMigrations";
import type { RqgItem } from "@items/rqgItem.ts";
import {
  migrateEffectArray,
  effectArraysChanged,
  toPersistedEffectArray,
} from "../shared-ae-migration-utils";

/**
 * ItemMigration: Process all effects on world-level items
 *
 * BG: PR4 moved derived values into non-persisted DataModel fields with v14 AE support.
 * This migration rewrites effects targeting the old paths to the new ones so they continue
 * to function correctly. This handles effects on world-level items (not embedded in actors).
 */
export const migrateItemActiveEffectPaths: ItemMigration = async (
  item: RqgItem,
): Promise<Item.UpdateData> => {
  const updateData: Item.UpdateData = {};
  const rawEffects = (item as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  // Migrate item-owned effects
  if (originalEffects.length > 0) {
    const migratedEffects = migrateEffectArray(originalEffects);

    if (effectArraysChanged(originalEffects, migratedEffects)) {
      updateData.effects = toPersistedEffectArray(migratedEffects) as any; // Type coercion needed for UpdateData
      originalEffects.forEach((effect) => {
        if (migratedEffects.some((migrated) => migrated !== effect)) {
          console.log(`RQG | Migrated AE paths on effect "${effect.name}" in item ${item.name}`);
        }
      });
    }
  }

  return updateData;
};
