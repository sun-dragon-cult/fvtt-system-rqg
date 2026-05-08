import type { ActorMigration } from "../applyMigrations";
import type { RqgActor } from "@actors/rqgActor.ts";
import {
  migrateEffectArray,
  effectArraysChanged,
  toPersistedEffectArray,
} from "../shared-ae-migration-utils";

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
): Actor.UpdateData => {
  const updateData: Actor.UpdateData = {};
  const rawEffects = (actor as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  // Migrate actor-owned effects
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
          console.log(`RQG | Migrated AE paths on effect "${effect.name}" for actor ${actor.name}`);
        }
      });
    }
  }

  return updateData;
};
