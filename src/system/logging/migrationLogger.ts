/**
 * Specialized logger for world migrations.
 *
 * Extends RqgLogger to capture migration-specific metadata (document links)
 * and feed directly into MigrationResult for reporting.
 */

import { RqgLogger, type LogOptions } from "./rqgLogger";
import type {
  MigrationDocumentLink,
  MigrationLogEntry,
  MigrationResult,
} from "../migrations/applyMigrations";

export interface MigrationLogOptions extends LogOptions {
  /** Links to affected documents shown in the migration report */
  documents?: MigrationDocumentLink[];
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
  constructor(private migrationResult: MigrationResult) {
    super("Migration");
  }

  override info(message: string, options?: MigrationLogOptions): void {
    super.info(message, { notify: false, ...options });
    this.captureToResult("info", message, options?.documents);
  }

  override warn(message: string, options?: MigrationLogOptions): void {
    super.warn(message, { notify: false, ...options });
    this.captureToResult("warn", message, options?.documents);
  }

  override error(message: string, options?: MigrationLogOptions): void {
    super.error(message, { notify: false, ...options });
    this.captureToResult("error", message, options?.documents);
  }

  /**
   * Feed log entry into migration result for reporting.
   */
  private captureToResult(
    level: "info" | "warn" | "error",
    message: string,
    documents?: MigrationDocumentLink[],
  ): void {
    const entry: MigrationLogEntry = {
      level,
      message,
      documents,
    };
    this.migrationResult.logEntries.push(entry);
  }
}
