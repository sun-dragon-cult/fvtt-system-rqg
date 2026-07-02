import type { ItemMigration } from "../apply-migrations";
import type { RqgItem } from "@items/rqg-item.ts";
import {
  type AERewriteWarningReason,
  effectArraysChanged,
  migrateEffectArrayWithSummary,
  toPersistedEffectArray,
} from "../shared-ae-migration-utils";

const WARNING_REASON_LABELS: Record<AERewriteWarningReason, string> = {
  "non-additive-mode": "non-additive-mode",
  "non-numeric-value": "non-numeric-value",
  "effect-processing-failure": "effect-processing-failure",
  "document-processing-failure": "document-processing-failure",
};

/**
 * ItemMigration: Process all effects on world-level items
 *
 * BG: PR4 moved derived values into non-persisted DataModel fields with v14 AE support.
 * This migration rewrites effects targeting the old paths to the new ones so they continue
 * to function correctly. This handles effects on world-level items (not embedded in actors).
 */
export const migrateItemActiveEffectPaths: ItemMigration = async (
  item: RqgItem,
  owningActor,
  logger,
): Promise<Item.UpdateData> => {
  const updateData: Item.UpdateData = {};
  const rawEffects = (item as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  // Migrate item-owned effects
  if (originalEffects.length > 0) {
    const { effects: migratedEffects, summary } = migrateEffectArrayWithSummary(
      originalEffects,
      owningActor,
    );

    if (summary.warningCount > 0) {
      for (const reason of Object.keys(summary.warningReasons) as AERewriteWarningReason[]) {
        const count = summary.warningReasons[reason];
        if (count > 0) {
          logger?.warn(
            `AE path rewrite warning on item ${item.name}: ${WARNING_REASON_LABELS[reason]} (${count})`,
            {
              notify: false,
              documents: [{ kind: "Item", uuid: item.uuid, label: item.name }],
            },
          );
        }
      }
    }

    if (effectArraysChanged(originalEffects, migratedEffects)) {
      const effectUpdates = originalEffects.flatMap((effect, index) => {
        const migrated = migratedEffects[index];
        if (!migrated || migrated === effect) {
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

      logger?.info(
        `Migrated AE changes on item ${item.name} (path rewrite counters: scanned effects=${summary.scannedEffects}, migrated changes=${summary.migratedChanges}, skipped changes=${summary.skippedChanges})`,
        {
          notify: false,
          documents: [{ kind: "Item", uuid: item.uuid, label: item.name }],
        },
      );
    }
  }

  return updateData;
};
