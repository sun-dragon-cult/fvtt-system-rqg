import type { ActiveEffectMigration } from "../apply-migrations";
import type { MigrationLogger } from "../../logging/migration-logger";

// Dummy ActiveEffect Migrator
export const migrateActiveEffectDummy: ActiveEffectMigration = async (
  effectData: ActiveEffect.Implementation,
  _migrationLogger?: MigrationLogger,
): Promise<ActiveEffect.UpdateData> => {
  void effectData;
  void _migrationLogger;

  let updateData: ActiveEffect.UpdateData = {};

  // eslint-disable-next-line no-constant-condition
  if (false) {
    updateData = {
      disabled: false,
    } as ActiveEffect.UpdateData;
  }

  return updateData;
};
