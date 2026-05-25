import { describe, it, expect, beforeEach } from "vitest";
import { MigrationLogger } from "./migrationLogger";
import type { MigrationResult } from "../migrations/applyMigrations";

describe("MigrationLogger capture resilience", () => {
  let migrationResult: MigrationResult;
  let logger: MigrationLogger;

  beforeEach(() => {
    migrationResult = {
      errorCount: 0,
      warningCount: 0,
      logCount: 0,
      logEntries: [],
      stats: {
        worldActorsInspected: 0,
        worldItemsInspected: 0,
        scenesInspected: 0,
        unlinkedTokenActorsInspected: 0,
        compendiumsInspected: 0,
        compendiumsSkippedByDesign: 0,
        compendiumDocumentsInspected: 0,
      },
    };
    logger = new MigrationLogger(migrationResult);
  });

  it("should capture info entries with documents even when changes are absent", () => {
    // Simulate a real migration log that failed to build changes but has document links.
    // This prevents performed migrations from disappearing when change-summary generation fails.
    logger.info("Migrating Actor document TestActor", {
      documents: [{ kind: "Actor", uuid: "Actor.123", label: "TestActor" }],
      changes: [], // Empty fallback when change-building fails
    });

    expect(migrationResult.logEntries).toHaveLength(1);
    const entry = migrationResult.logEntries[0]!;
    expect(entry.level).toBe("info");
    expect(entry.documents).toEqual([{ kind: "Actor", uuid: "Actor.123", label: "TestActor" }]);
  });

  it("should capture info entries with migrationName", () => {
    logger.info("Migrating Item document TestItem", {
      migrationName: "migrateItemActiveEffectPaths",
      changes: [
        {
          key: "system.changes[].key",
          previousValue: "(undefined)",
          newValue: "system.effect.changes[].key",
          diffLines: [{ kind: "added", value: "+ system.effect.changes[].key" }],
        },
      ],
    });

    expect(migrationResult.logEntries).toHaveLength(1);
    expect(migrationResult.logEntries[0]!.migrationName).toBe("migrateItemActiveEffectPaths");
  });

  it("should NOT capture plain state/progress info without documents, changes, or migrationName", () => {
    // Pure progress/state logs should be filtered at capture time.
    logger.info("Migrating embedded Items for Actor TestActor");
    logger.info("Step 1 / 4 - Processing actors");

    expect(migrationResult.logEntries).toHaveLength(0);
  });

  it("should capture warning entries regardless of metadata", () => {
    // Warnings are always important; don't filter them.
    logger.warn("Weapon has unresolved skill");

    expect(migrationResult.logEntries).toHaveLength(1);
    expect(migrationResult.logEntries[0]!.level).toBe("warn");
  });

  it("should capture error entries regardless of metadata", () => {
    // Errors are always important; don't filter them.
    logger.error("Failed migration for Item");

    expect(migrationResult.logEntries).toHaveLength(1);
    expect(migrationResult.logEntries[0]!.level).toBe("error");
  });

  it("should respect scoped logger migrationName with withMigration", () => {
    const scopedLogger = logger.withMigration("migrateWeaponSkillLinks");
    scopedLogger.warn("Unresolved skill link in weapon", {
      documents: [{ kind: "Item", uuid: "Item.456", label: "Weapon" }],
    });

    expect(migrationResult.logEntries).toHaveLength(1);
    expect(migrationResult.logEntries[0]!.migrationName).toBe("migrateWeaponSkillLinks");
  });
});
