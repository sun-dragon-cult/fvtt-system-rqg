import { describe, it, expect } from "vitest";
import { mergeMigrationUpdateData, mergeEmbeddedEffectsUpdates } from "./apply-migrations";

/**
 * Regression coverage for issue #942: an embedded ActiveEffect that needed both
 * a legacy path rewrite (migrateItemActiveEffectPaths) and a duration-unit
 * normalization (migrateItemActiveEffectDurationUnits) lost the path rewrite
 * because foundry.utils.mergeObject replaces arrays wholesale instead of
 * merging their entries by _id. mergeMigrationUpdateData/mergeEmbeddedEffectsUpdates
 * fix that by merging embedded `effects` update arrays entry-by-entry.
 */
describe("mergeEmbeddedEffectsUpdates", () => {
  it("combines two partial updates for the same effect instead of one replacing the other", () => {
    const fromPathRewrite = [
      { _id: "effect-1", system: { changes: [{ key: "system.effect.add.magicPoints.max" }] } },
    ];
    const fromDurationFix = [{ _id: "effect-1", duration: { seconds: null }, start: { time: 0 } }];

    const merged = mergeEmbeddedEffectsUpdates(fromPathRewrite, fromDurationFix);

    expect(merged).toEqual([
      {
        _id: "effect-1",
        system: { changes: [{ key: "system.effect.add.magicPoints.max" }] },
        duration: { seconds: null },
        start: { time: 0 },
      },
    ]);
  });

  it("keeps unrelated effects from both sides untouched", () => {
    const existing = [{ _id: "effect-1", system: { changes: [] } }];
    const incoming = [{ _id: "effect-2", duration: { seconds: 10 } }];

    const merged = mergeEmbeddedEffectsUpdates(existing, incoming);

    expect(merged).toEqual([
      { _id: "effect-1", system: { changes: [] } },
      { _id: "effect-2", duration: { seconds: 10 } },
    ]);
  });
});

describe("mergeMigrationUpdateData", () => {
  it("merges effects arrays from successive migration functions by _id instead of overwriting", () => {
    // Simulates getItemMigrationUpdates() folding migrateItemActiveEffectPaths'
    // result, then migrateItemActiveEffectDurationUnits' result, into one updateData.
    let updateData: Record<string, unknown> = {};

    const pathRewriteUpdate = {
      effects: [
        { _id: "effect-1", system: { changes: [{ key: "system.effect.add.magicPoints.max" }] } },
      ],
    };
    updateData = mergeMigrationUpdateData(updateData, pathRewriteUpdate);

    const durationFixUpdate = {
      effects: [{ _id: "effect-1", duration: { seconds: null }, start: { time: 0 } }],
    };
    updateData = mergeMigrationUpdateData(updateData, durationFixUpdate);

    const effects = updateData["effects"] as any[];
    expect(effects).toHaveLength(1);
    // The path rewrite must survive the later duration-only update.
    expect(effects[0].system.changes[0].key).toBe("system.effect.add.magicPoints.max");
    expect(effects[0].duration).toEqual({ seconds: null });
    expect(effects[0].start).toEqual({ time: 0 });
  });

  it("still merges non-effects keys the normal mergeObject way", () => {
    let updateData: Record<string, unknown> = {};
    updateData = mergeMigrationUpdateData(updateData, { name: "New Name" });
    updateData = mergeMigrationUpdateData(updateData, { system: { pow: 10 } });

    expect(updateData).toEqual({ name: "New Name", system: { pow: 10 } });
  });
});
