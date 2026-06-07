import type { ActiveEffectMigration } from "../apply-migrations";
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
  logger,
): Promise<ActiveEffect.UpdateData> => {
  const updateData: ActiveEffect.UpdateData = {};
  const effectAsAny = effect as any;

  if (migrateEffectTypesAndPaths(effectAsAny)) {
    logger?.info(`Migrated AE paths on compendium effect "${effect.name}"`, {
      notify: false,
      documents: [{ kind: "ActiveEffect", uuid: effect.uuid, label: effect.name }],
    });
    if (Array.isArray(effectAsAny.system?.changes)) {
      updateData.system = {
        changes: effectAsAny.system.changes,
      } as any;
    }
  }

  return updateData;
};
