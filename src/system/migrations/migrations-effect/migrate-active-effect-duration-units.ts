import type { ActiveEffectMigration } from "../apply-migrations";
import { normalizeLegacyActiveEffectDuration } from "../shared-ae-duration-migration-utils";

/**
 * ActiveEffectMigration: Normalize legacy ActiveEffect duration data to v14 unit-based shape.
 */
export const migrateActiveEffectDurationUnits: ActiveEffectMigration = async (
  effect: ActiveEffect.Implementation,
  logger,
): Promise<ActiveEffect.UpdateData> => {
  const normalized = normalizeLegacyActiveEffectDuration(effect);
  if (!normalized) {
    return {};
  }

  logger?.info(`Migrated AE duration units on compendium effect "${effect.name}"`, {
    notify: false,
    documents: [{ kind: "ActiveEffect", uuid: effect.uuid, label: effect.name }],
  });

  return {
    duration: normalized.duration as any,
    // @ts-expect-error TEMP(v14-types): start shape exists in Foundry v14 runtime.
    start: normalized.start,
  };
};
