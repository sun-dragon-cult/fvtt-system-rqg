import type { ItemMigration } from "../applyMigrations";
import type { RqgItem } from "@items/rqgItem.ts";
import {
  effectArraysChanged,
  migrateEffectTypeArray,
  toPersistedEffectArray,
} from "../shared-ae-migration-utils";

/**
 * ItemMigration: Repair malformed ActiveEffect change.type values on item effects.
 */
export const migrateItemActiveEffectTypes: ItemMigration = async (
  item: RqgItem,
  _owningActor,
  logger,
): Promise<Item.UpdateData> => {
  const updateData: Item.UpdateData = {};
  const rawEffects = (item as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  if (originalEffects.length > 0) {
    const migratedEffects = migrateEffectTypeArray(originalEffects);

    if (effectArraysChanged(originalEffects, migratedEffects)) {
      updateData.effects = toPersistedEffectArray(migratedEffects) as any;
      logger?.info(`Repaired AE change.type values in item ${item.name}`, {
        notify: false,
        documents: [{ kind: "Item", uuid: item.uuid, label: item.name }],
      });
    }
  }

  return updateData;
};
