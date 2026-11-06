import type { MigrationResult, MigrationStats } from "./apply-migrations";

/** One changed value in a migrated document. `from` and `to` are the values as display strings. */
export interface MigrationReportChange {
  path: string;
  from: string;
  to: string;
}

/** What a run changed, or with `dryRun` would change, in one document. */
export interface MigrationReportDocument {
  kind: string;
  uuid: string | null;
  name: string;
  /** The migration functions that changed it. */
  migration?: string;
  changes: MigrationReportChange[];
  /** Changes left out of `changes` because there were too many to list. */
  hiddenChangeCount: number;
}

/**
 * What `game.system.api.maintenance.applyWorldMigrations` returns.
 *
 * @public since 6.2.0
 */
export interface MigrationReport {
  dryRun: boolean;
  errorCount: number;
  warningCount: number;
  /** How many documents of each kind were looked at. */
  inspected: MigrationStats;
  documents: MigrationReportDocument[];
  errors: { message: string; uuid: string | null }[];
}

export function toMigrationReport(result: MigrationResult, dryRun: boolean): MigrationReport {
  const documents: MigrationReportDocument[] = [];
  const errors: MigrationReport["errors"] = [];
  for (const entry of result.logEntries) {
    if (entry.level === "error") {
      errors.push({ message: entry.message, uuid: entry.documents?.[0]?.uuid ?? null });
      continue;
    }
    const main = entry.documents?.[0];
    if (!main || !entry.changes?.length) {
      continue;
    }
    documents.push({
      kind: main.kind,
      uuid: main.uuid,
      name: main.label,
      ...(entry.migrationName ? { migration: entry.migrationName } : {}),
      changes: entry.changes.map((row) => ({
        path: row.key,
        from: row.previousValue,
        to: row.newValue,
      })),
      hiddenChangeCount: entry.hiddenChangeCount ?? 0,
    });
  }
  return {
    dryRun,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    inspected: { ...result.stats },
    documents,
    errors,
  };
}
