import type { ActiveEffectMigration } from "../applyMigrations";
import { migrateEffectChangeTypes } from "../shared-ae-migration-utils";

/**
 * ActiveEffectMigration: Repair malformed change.type values on standalone ActiveEffect docs.
 */
export const migrateActiveEffectActiveEffectTypes: ActiveEffectMigration = async (
  effect: ActiveEffect.Implementation,
): Promise<ActiveEffect.UpdateData> => {
  const updateData: ActiveEffect.UpdateData = {};
  const effectAsAny = effect as any;

  if (migrateEffectChangeTypes(effectAsAny) && Array.isArray(effectAsAny.system?.changes)) {
    updateData.system = {
      changes: effectAsAny.system.changes,
    } as any;
    console.log(`RQG | Repaired AE change.type values on compendium effect "${effect.name}"`);
  }

  return updateData;
};
