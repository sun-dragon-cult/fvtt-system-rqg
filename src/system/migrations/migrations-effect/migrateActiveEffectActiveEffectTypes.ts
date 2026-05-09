import type { ActiveEffectMigration } from "../applyMigrations";
import { RqgLogger } from "../../logging/rqgLogger";

const logger = new RqgLogger("ActiveEffectTypes");
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
    logger.info(`Repaired AE change.type values on compendium effect "${effect.name}"`, {
      notify: false,
    });
  }

  return updateData;
};
