import type { ActiveEffectMigration } from "../applyMigrations";
import { RqgLogger } from "../../logging/rqgLogger";

const logger = new RqgLogger("ActiveEffectPaths");
import { migrateEffectTypesAndPaths } from "../shared-ae-migration-utils";

/**
 * ActiveEffectMigration: Process standalone ActiveEffect documents in compendium packs
 *
 * BG: PR4 moved derived values into non-persisted DataModel fields with v14 AE support.
 * This migration rewrites the legacy path on the effect's own changes array.
 *
 * In v14, ActiveEffect is a first-class compendium document type. These documents are
 * standalone — not embedded in an Actor or Item — and require their own migration pass.
 */
export const migrateActiveEffectActiveEffectPaths: ActiveEffectMigration = async (
  effect: ActiveEffect.Implementation,
): Promise<ActiveEffect.UpdateData> => {
  const updateData: ActiveEffect.UpdateData = {};
  const effectAsAny = effect as any;

  if (migrateEffectTypesAndPaths(effectAsAny)) {
    logger.info(`Migrated AE paths on compendium effect "${effect.name}"`, { notify: false });
    if (Array.isArray(effectAsAny.system?.changes)) {
      updateData.system = {
        changes: effectAsAny.system.changes,
      } as any;
    }
  }

  return updateData;
};
