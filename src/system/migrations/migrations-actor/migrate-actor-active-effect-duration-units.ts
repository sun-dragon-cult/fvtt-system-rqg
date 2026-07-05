import type { ActorMigration } from "../apply-migrations";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { normalizeLegacyActiveEffectDuration } from "../shared-ae-duration-migration-utils";

/**
 * ActorMigration: Normalize legacy ActiveEffect duration data to v14 unit-based shape.
 */
export const migrateActorActiveEffectDurationUnits: ActorMigration = (
  actor: RqgActor,
  logger,
): Actor.UpdateData => {
  const updateData: Actor.UpdateData = {};
  const rawEffects = (actor as any).effects;
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
    logger?.info(`Migrated AE duration units for actor ${actor.name}`, {
      notify: false,
      documents: [{ kind: "Actor", uuid: actor.uuid, label: actor.name }],
    });
  }

  return updateData;
};
