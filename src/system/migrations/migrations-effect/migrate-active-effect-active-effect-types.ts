import type { ActiveEffectMigration } from "../apply-migrations";
import { migrateEffectChangeTypes } from "../shared-ae-migration-utils";

/**
 * ActiveEffectMigration: Repair malformed change.type values on standalone ActiveEffect docs.
 */
export const migrateActiveEffectActiveEffectTypes: ActiveEffectMigration = async (
  effect: ActiveEffect.Implementation,
  logger,
): Promise<ActiveEffect.UpdateData> => {
  const updateData: ActiveEffect.UpdateData = {};
  const effectAsAny = effect as any;

  if (migrateEffectChangeTypes(effectAsAny) && Array.isArray(effectAsAny.system?.changes)) {
    updateData.system = {
      changes: effectAsAny.system.changes,
    } as any;
    logger?.info(`Repaired AE change.type values on compendium effect "${effect.name}"`, {
      notify: false,
      documents: [{ kind: "ActiveEffect", uuid: effect.uuid, label: effect.name }],
    });
  }

  return updateData;
};
