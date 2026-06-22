import type { ActorMigration } from "../apply-migrations";
import type { RqgActor } from "@actors/rqg-actor.ts";
import {
  type AERewriteWarningReason,
  effectArraysChanged,
  migrateEffectArrayWithSummary,
  toPersistedEffectArray,
} from "../shared-ae-migration-utils";

const WARNING_REASON_LABELS: Record<AERewriteWarningReason, string> = {
  "non-additive-mode": "non-additive-mode",
  "non-numeric-value": "non-numeric-value",
  "duplicate-target-key": "duplicate-target-key",
  "effect-processing-failure": "effect-processing-failure",
  "document-processing-failure": "document-processing-failure",
};

/**
 * ActorMigration: Process actor-owned effects only
 *
 * BG: PR4 moved derived values into non-persisted DataModel fields with v14 AE support.
 * This migration rewrites effects targeting the old paths to the new ones so they continue
 * to function correctly.
 *
 * NOTE: Embedded item effects are migrated by item migrations in applyMigrations.
 */
export const migrateActorActiveEffectPaths: ActorMigration = (
  actor: RqgActor,
  logger,
): Actor.UpdateData => {
  const updateData: Actor.UpdateData = {};
  const rawEffects = (actor as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  // Migrate actor-owned effects
  if (originalEffects.length > 0) {
    const { effects: migratedEffects, summary } = migrateEffectArrayWithSummary(
      originalEffects,
      actor,
    );

    if (summary.warningCount > 0) {
      for (const reason of Object.keys(summary.warningReasons) as AERewriteWarningReason[]) {
        const count = summary.warningReasons[reason];
        if (count > 0) {
          logger?.warn(
            `AE path rewrite warning for actor ${actor.name}: ${WARNING_REASON_LABELS[reason]} (${count})`,
            {
              notify: false,
              documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }],
            },
          );
        }
      }
    }

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

      logger?.info(
        `Migrated AE paths for actor ${actor.name}: scanned effects=${summary.scannedEffects}, migrated changes=${summary.migratedChanges}, skipped changes=${summary.skippedChanges}`,
        {
          notify: false,
          documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }],
        },
      );
    }
  }

  return updateData;
};
