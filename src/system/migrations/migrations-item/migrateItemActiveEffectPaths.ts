import type { ItemMigration } from "../applyMigrations";
import { RqgLogger } from "../../logging/rqgLogger";

const logger = new RqgLogger("ItemActiveEffectPaths");
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
      const effectUpdates = originalEffects.flatMap((effect, index) => {
        const migrated = migratedEffects[index];
        if (migrated === effect) {
          return [];
        }

        const persisted = toPersistedEffectArray([migrated])[0] as any;
        const effectId =
          persisted?._id ?? persisted?.id ?? (effect as any)?._id ?? (effect as any)?.id;
        if (!effectId) {
          return [];
        }

        return [
          {
            _id: effectId,
            system: {
              changes: persisted?.system?.changes ?? [],
            },
          },
        ];
      });

      if (effectUpdates.length > 0) {
        updateData.effects = effectUpdates as any; // Type coercion needed for UpdateData
      }

      originalEffects.forEach((effect, index) => {
        if (migratedEffects[index] !== effect) {
          logger.info(`Migrated AE paths on effect "${effect.name}" in item ${item.name}`, {
            notify: false,
          });
        }
      });
    }
  }

  return updateData;
};
