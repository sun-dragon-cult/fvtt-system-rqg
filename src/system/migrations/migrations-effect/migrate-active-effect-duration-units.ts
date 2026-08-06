import type { ActiveEffectMigration } from "../apply-migrations";
import { normalizeLegacyActiveEffectDuration } from "../shared-ae-duration-migration-utils";

/**
 * ActiveEffectMigration: Normalize legacy ActiveEffect duration data to v14 unit-based shape.
 */
export const migrateActiveEffectDurationUnits: ActiveEffectMigration = async (
  effect: ActiveEffect.Implementation,
  _logger,
): Promise<ActiveEffect.UpdateData> => {
  const normalized = normalizeLegacyActiveEffectDuration(effect);
  if (!normalized) {
    return {};
  }

  return {
    duration: normalized.duration as any,
    // @ts-expect-error TEMP(v14-types): start shape exists in Foundry v14 runtime.
    start: normalized.start,
  };
};
