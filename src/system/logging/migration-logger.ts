/**
 * Specialized logger for world migrations.
 *
 * Extends RqgLogger to capture migration-specific metadata (document links)
 * and feed directly into MigrationResult for reporting.
 */

import { RqgLogger, type LogOptions } from "./rqg-logger";
import type {
  MigrationChangeRow,
  MigrationDocumentLink,
  MigrationLogEntry,
  MigrationResult,
} from "../migrations/apply-migrations";

export interface MigrationLogOptions extends LogOptions {
  /** Links to affected documents shown in the migration report */
  documents?: MigrationDocumentLink[];
  /** Structured field changes shown on the performed migrations page */
  changes?: MigrationChangeRow[];
  /** Count of additional field changes omitted from the rendered table */
  hiddenChangeCount?: number;
  /** Name of the migration function producing this entry */
  migrationName?: string;
}

/**
 * Logger for world migration system.
 *
 * Extends RqgLogger with document link capture for the migration report.
 * Notifications are suppressed by default — the report dialog replaces them.
 *
 * Usage:
 * ```typescript
 * const logger = new MigrationLogger(migrationResult);
 * logger.warn("Weapon has unresolved skill", {
 *   documents: [{ kind: "Item", uuid: item.uuid, label: item.name }]
 * });
 * ```
 */
export class MigrationLogger extends RqgLogger {
  constructor(
    private migrationResult: MigrationResult,
    private readonly defaultMigrationName?: string,
  ) {
    super("Migration");
  }

  withMigration(migrationName: string): MigrationLogger {
    return new MigrationLogger(this.migrationResult, migrationName);
  }

  override info(message: string, options?: MigrationLogOptions): void {
    super.info(message, { notify: false, ...options });
    this.captureToResult(
      "info",
      message,
      options?.documents,
      options?.changes,
      options?.hiddenChangeCount,
      options?.migrationName ?? this.defaultMigrationName,
    );
  }

  override warn(message: string, options?: MigrationLogOptions): void {
    super.warn(message, { notify: false, ...options });
    this.captureToResult(
      "warn",
      message,
      options?.documents,
      options?.changes,
      options?.hiddenChangeCount,
      options?.migrationName ?? this.defaultMigrationName,
    );
  }

  override error(message: string, options?: MigrationLogOptions): void {
    super.error(message, { notify: false, ...options });
    this.captureToResult(
      "error",
      message,
      options?.documents,
      options?.changes,
      options?.hiddenChangeCount,
      options?.migrationName ?? this.defaultMigrationName,
    );
  }

  /**
   * Feed log entry into migration result for reporting.
   */
  private captureToResult(
    level: "info" | "warn" | "error",
    message: string,
    documents?: MigrationDocumentLink[],
    changes?: MigrationChangeRow[],
    hiddenChangeCount?: number,
    migrationName?: string,
  ): void {
    // Keep report logs focused on actionable migration events.
    // Plain progress/state info messages should stay in console but not in report entries.
    // Preserve entries that have either structured changes, a migration function name, or document links.
    if (level === "info" && !(changes?.length || migrationName || documents?.length)) {
      return;
    }

    const entry: MigrationLogEntry = {
      level,
      message,
      documents,
      ...(changes?.length ? { changes } : {}),
      ...(hiddenChangeCount ? { hiddenChangeCount } : {}),
      ...(migrationName ? { migrationName } : {}),
    };
    this.migrationResult.logEntries.push(entry);
  }
}
