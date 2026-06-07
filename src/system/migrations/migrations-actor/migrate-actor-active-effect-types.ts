import type { ActorMigration } from "../apply-migrations";
import type { RqgActor } from "@actors/rqg-actor.ts";
import {
  effectArraysChanged,
  migrateEffectTypeArray,
  toPersistedEffectArray,
} from "../shared-ae-migration-utils";

/**
 * ActorMigration: Repair malformed ActiveEffect change.type values on actor-owned effects.
 */
export const migrateActorActiveEffectTypes: ActorMigration = (
  actor: RqgActor,
  logger,
): Actor.UpdateData => {
  const updateData: Actor.UpdateData = {};
  const rawEffects = (actor as any).effects;
  const originalEffects = Array.isArray(rawEffects)
    ? rawEffects
    : Array.from(rawEffects?.values?.() ?? []);

  if (originalEffects.length > 0) {
    const migratedEffects = migrateEffectTypeArray(originalEffects);

    if (effectArraysChanged(originalEffects, migratedEffects)) {
      updateData.effects = toPersistedEffectArray(migratedEffects) as any;
      logger?.info(`Repaired AE change.type values for actor ${actor.name}`, {
        notify: false,
        documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }],
      });
    }
  }

  return updateData;
};
