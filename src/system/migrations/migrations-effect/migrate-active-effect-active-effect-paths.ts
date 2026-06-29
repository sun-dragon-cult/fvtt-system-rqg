import type { ActiveEffectMigration } from "../apply-migrations";
import {
  type AERewriteWarningReason,
  migrateEffectTypesAndPathsWithSummary,
} from "../shared-ae-migration-utils";

const WARNING_REASON_LABELS: Record<AERewriteWarningReason, string> = {
  "non-additive-mode": "non-additive-mode",
  "non-numeric-value": "non-numeric-value",
  "effect-processing-failure": "effect-processing-failure",
  "document-processing-failure": "document-processing-failure",
};

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
  const rewriteResult = migrateEffectTypesAndPathsWithSummary(effectAsAny);

  if (rewriteResult.summary.warningCount > 0) {
    for (const reason of Object.keys(
      rewriteResult.summary.warningReasons,
    ) as AERewriteWarningReason[]) {
      const count = rewriteResult.summary.warningReasons[reason];
      if (count > 0) {
        logger?.warn(
          `AE path rewrite warning on compendium effect "${effect.name}": ${WARNING_REASON_LABELS[reason]} (${count})`,
          {
            notify: false,
            documents: [{ kind: "ActiveEffect", uuid: effect.uuid, label: effect.name }],
          },
        );
      }
    }
  }

  if (rewriteResult.changed) {
    logger?.info(
      `Migrated AE paths on compendium effect "${effect.name}": scanned effects=${rewriteResult.summary.scannedEffects}, migrated changes=${rewriteResult.summary.migratedChanges}, skipped changes=${rewriteResult.summary.skippedChanges}`,
      {
        notify: false,
        documents: [{ kind: "ActiveEffect", uuid: effect.uuid, label: effect.name }],
      },
    );
    if (Array.isArray(effectAsAny.system?.changes)) {
      updateData.system = {
        changes: effectAsAny.system.changes,
      } as any;
    }
  }

  return updateData;
};
