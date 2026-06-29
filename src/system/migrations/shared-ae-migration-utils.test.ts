import { describe, expect, it } from "vitest";
import {
  migrateEffectChangesWithSummary,
  migrateEffectArrayWithSummary,
  migrateEffectTypesAndPaths,
  migrateEffectTypesAndPathsWithSummary,
  runAEPathRewriteForOwners,
} from "./shared-ae-migration-utils";

describe("shared-ae-migration-utils path rewrite framework", () => {
  it("migrates add-mode numeric legacy keys", () => {
    const effect = {
      system: {
        changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: "4" }],
      },
    };

    const result = migrateEffectChangesWithSummary(effect);

    expect(result.changed).toBe(true);
    expect(effect.system.changes[0]!.key).toBe("system.effect.magicPoints.max");
    expect(effect.system.changes[0]!.value).toBe(4);
    expect(result.summary.migratedChanges).toBe(1);
    expect(result.summary.skippedChanges).toBe(0);
  });

  it("is idempotent and does not re-migrate already migrated keys", () => {
    const effect = {
      system: {
        changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: 2 }],
      },
    };

    const firstPass = migrateEffectChangesWithSummary(effect);
    const secondPass = migrateEffectChangesWithSummary(effect);

    expect(firstPass.changed).toBe(true);
    expect(secondPass.changed).toBe(false);
    expect(secondPass.summary.migratedChanges).toBe(0);
    expect(effect.system.changes[0]!.key).toBe("system.effect.hitPoints.max");
  });

  it("skips non-additive mode changes and reports warning reason", () => {
    const effect = {
      system: {
        changes: [{ key: "system.attributes.magicPoints.max", type: "multiply", value: 2 }],
      },
    };

    const result = migrateEffectChangesWithSummary(effect);

    expect(result.changed).toBe(false);
    expect(effect.system.changes[0]!.key).toBe("system.attributes.magicPoints.max");
    expect(result.summary.skippedChanges).toBe(1);
    expect(result.summary.warningReasons["non-additive-mode"]).toBe(1);
  });

  it("migrates legacy rows even when target key already exists on effect", () => {
    const effect = {
      system: {
        changes: [
          { key: "system.attributes.magicPoints.max", type: "add", value: 5 },
          { key: "system.effect.magicPoints.max", type: "add", value: 1 },
        ],
      },
    };

    const result = migrateEffectChangesWithSummary(effect);

    expect(result.changed).toBe(true);
    expect(effect.system.changes[0]!.key).toBe("system.effect.magicPoints.max");
    expect(effect.system.changes[1]!.key).toBe("system.effect.magicPoints.max");
    expect(result.summary.migratedChanges).toBe(1);
    expect(result.summary.skippedChanges).toBe(0);
  });

  it("migrates multiple legacy additive rows to same target when target did not pre-exist", () => {
    const effect = {
      system: {
        changes: [
          { key: "system.attributes.magicPoints.max", type: "add", value: 2 },
          { key: "system.attributes.magicPoints.max", type: "add", value: 3 },
        ],
      },
    };

    const result = migrateEffectChangesWithSummary(effect);

    expect(result.changed).toBe(true);
    expect(effect.system.changes[0]!.key).toBe("system.effect.magicPoints.max");
    expect(effect.system.changes[1]!.key).toBe("system.effect.magicPoints.max");
    expect(effect.system.changes[0]!.value).toBe(2);
    expect(effect.system.changes[1]!.value).toBe(3);
    expect(result.summary.migratedChanges).toBe(2);
  });

  it("skips non-numeric values and reports warning reason", () => {
    const effect = {
      system: {
        changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: "abc" }],
      },
    };

    const result = migrateEffectChangesWithSummary(effect);

    expect(result.changed).toBe(false);
    expect(effect.system.changes[0]!.key).toBe("system.attributes.hitPoints.max");
    expect(result.summary.warningReasons["non-numeric-value"]).toBe(1);
    expect(result.summary.skippedChanges).toBe(1);
  });

  it("supports dry-run diagnostics without mutating effect data", () => {
    const effect = {
      system: {
        changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: "3" }],
      },
    };

    const result = migrateEffectChangesWithSummary(effect, { dryRun: true });

    expect(result.changed).toBe(false);
    expect(effect.system.changes[0]!.key).toBe("system.attributes.magicPoints.max");
    expect(result.summary.migratedChanges).toBe(1);
  });

  it("repairs legacy change.type values on non-legacy keys in the combined helper", () => {
    const effect = {
      system: {
        changes: [{ key: "system.effect.magicPoints.max", type: "subtract", value: 3 }],
      },
    };

    const changed = migrateEffectTypesAndPaths(effect);

    expect(changed).toBe(true);
    expect(effect.system.changes[0]!.key).toBe("system.effect.magicPoints.max");
    expect(effect.system.changes[0]!.type).toBe("add");
  });

  it("reports changed when only change.type normalization occurs", () => {
    const effect = {
      system: {
        changes: [{ key: "system.effect.hitPoints.max", type: "custom.2", value: 4 }],
      },
    };

    const result = migrateEffectTypesAndPathsWithSummary(effect);

    expect(result.changed).toBe(true);
    expect(effect.system.changes[0]!.key).toBe("system.effect.hitPoints.max");
    expect(effect.system.changes[0]!.type).toBe("add");
    expect(result.summary.migratedChanges).toBe(0);
    expect(result.summary.skippedChanges).toBe(0);
  });

  it("aggregates nested owner runs with accurate summary counters", () => {
    const actorOwner = {
      id: "actor-1",
      name: "Actor One",
      effects: [
        {
          id: "effect-1",
          system: {
            changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: 5 }],
          },
        },
        {
          id: "effect-2",
          system: {
            changes: [{ key: "system.attributes.hitPoints.max", type: "multiply", value: 2 }],
          },
        },
      ],
    };

    const itemOwner = {
      id: "item-1",
      name: "Item One",
      effects: [
        {
          id: "effect-3",
          system: {
            changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: "abc" }],
          },
        },
      ],
    };

    const mixedOwner = {
      id: "item-2",
      name: "Item Two",
      effects: [
        {
          id: "effect-4",
          system: {
            changes: [
              { key: "system.attributes.magicPoints.max", type: "add", value: 7 },
              { key: "system.effect.magicPoints.max", type: "add", value: 2 },
            ],
          },
        },
      ],
    };

    const compendiumEffectOwner = {
      id: "effect-5",
      name: "Compendium Effect",
      effects: [
        {
          id: "effect-5",
          system: {
            changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: 9 }],
          },
        },
      ],
    };

    const runResult = runAEPathRewriteForOwners([
      actorOwner,
      itemOwner,
      mixedOwner,
      compendiumEffectOwner,
    ]);

    expect(runResult.ownersScanned).toBe(4);
    expect(runResult.ownersUpdated).toBe(3);
    expect(runResult.ownersFailed).toBe(0);
    expect(runResult.summary.scannedEffects).toBe(5);
    expect(runResult.summary.migratedChanges).toBe(3);
    expect(runResult.summary.skippedChanges).toBe(2);
    expect(runResult.summary.warningReasons["non-additive-mode"]).toBe(1);
    expect(runResult.summary.warningReasons["non-numeric-value"]).toBe(1);
    expect(runResult.updates).toHaveLength(3);
    const updatedKeys = runResult.updates
      .map((update) => update.effects[0]?.system?.changes[0]?.key)
      .filter((key): key is string => typeof key === "string");
    expect(updatedKeys).toContain("system.effect.magicPoints.max");
    expect(updatedKeys).toContain("system.effect.hitPoints.max");
  });

  it("supports dry-run array migration summaries without churn", () => {
    const sourceEffects = [
      {
        id: "effect-1",
        system: {
          changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: 6 }],
        },
      },
    ];

    const result = migrateEffectArrayWithSummary(sourceEffects, undefined, { dryRun: true });

    expect(result.summary.migratedChanges).toBe(1);
    expect(result.effects[0]).toBe(sourceEffects[0]);
  });
});
