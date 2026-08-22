import { describe, it, expect } from "vitest";
import { mergeMigrationUpdateData, patchItemEffectsForPendingUpdates } from "./apply-migrations";
import { migrateItemActiveEffectPaths } from "./migrations-item/migrate-item-active-effect-paths";
import { migrateItemPowCrystalToStoredMagicPoints } from "./migrations-item/migrate-item-pow-crystal-to-stored-magic-points";
import type { RqgItem } from "@items/rqg-item.ts";

/**
 * Regression coverage: a first-time-migrated crystal item (legacy `system.attributes.
 * magicPoints.max` AE key) had its key renamed by migrateItemActiveEffectPaths but was never
 * converted to storedMagicPoints by migrateItemPowCrystalToStoredMagicPoints, because that later
 * migration inspected the item's live, still-unrenamed effects rather than the pending update
 * from the earlier one - both migrations ran in the same getItemMigrationUpdates pass against the
 * original document state. Reported via a Molten Hosting migration where "Magic crystal" items
 * ended up with the renamed key but storedMagicPoints still {value:0, max:0, identified:false}.
 */
function legacyCrystalItem(): any {
  return {
    name: "Magic crystal",
    id: "item-1",
    uuid: "Item.item-1",
    type: "gear",
    system: { storedMagicPoints: { value: 0, max: 0, identified: false } },
    effects: [
      {
        _id: "effect-1",
        name: "New Active Effect",
        system: {
          changes: [
            {
              key: "system.attributes.magicPoints.max",
              value: 12,
              priority: null,
              type: "add",
              phase: "initial",
            },
          ],
        },
      },
    ],
  };
}

describe("patchItemEffectsForPendingUpdates", () => {
  it("returns the original item unchanged when there is no pending effects update", () => {
    const item = legacyCrystalItem();
    expect(patchItemEffectsForPendingUpdates(item as RqgItem, {})).toBe(item);
  });

  it("overlays a pending effect patch onto .effects, leaving other properties untouched", () => {
    const item = legacyCrystalItem();
    const pendingUpdateData = {
      effects: [
        {
          _id: "effect-1",
          system: {
            changes: [{ key: "system.effect.add.magicPoints.max", value: 12, type: "add" }],
          },
        },
      ],
    };

    const patched = patchItemEffectsForPendingUpdates(item as RqgItem, pendingUpdateData as any);

    expect((patched as any).effects[0].system.changes[0].key).toBe(
      "system.effect.add.magicPoints.max",
    );
    expect((patched as any).name).toBe("Magic crystal");
  });

  it("overlays non-system top-level patch fields too, e.g. duration/start from migrateItemActiveEffectDurationUnits", () => {
    const item = legacyCrystalItem();
    const pendingUpdateData = {
      effects: [
        {
          _id: "effect-1",
          duration: { value: 10, units: "rounds" },
          start: {
            time: 0,
            round: null,
            turn: null,
            combat: null,
            combatant: null,
            initiative: null,
          },
        },
      ],
    };

    const patched = patchItemEffectsForPendingUpdates(item as RqgItem, pendingUpdateData as any);

    expect((patched as any).effects[0].duration).toEqual({ value: 10, units: "rounds" });
    expect((patched as any).effects[0].start.time).toBe(0);
    // The original system.changes (untouched by this patch) must still be visible.
    expect((patched as any).effects[0].system.changes[0].key).toBe(
      "system.attributes.magicPoints.max",
    );
  });
});

describe("migrateItemActiveEffectPaths + migrateItemPowCrystalToStoredMagicPoints sequencing", () => {
  it("without patching, the crystal conversion misses the just-renamed key (the bug)", async () => {
    const item = legacyCrystalItem();

    const pathRewriteUpdate = await migrateItemActiveEffectPaths(item);
    // Bug reproduction: pass the *unpatched* live item, as the old getItemMigrationUpdates did.
    const crystalUpdate = await migrateItemPowCrystalToStoredMagicPoints(item);

    expect((pathRewriteUpdate.effects as any[])?.[0]?.system?.changes?.[0]?.key).toBe(
      "system.effect.add.magicPoints.max",
    );
    expect(crystalUpdate).toEqual({});
  });

  it("with patching, the crystal conversion sees the renamed key and converts it (the fix)", async () => {
    const item = legacyCrystalItem();
    let updateData: any = {};

    const pathRewriteUpdate = await migrateItemActiveEffectPaths(
      patchItemEffectsForPendingUpdates(item, updateData),
    );
    updateData = mergeMigrationUpdateData(updateData, pathRewriteUpdate);

    const crystalUpdate = await migrateItemPowCrystalToStoredMagicPoints(
      patchItemEffectsForPendingUpdates(item, updateData),
    );
    updateData = mergeMigrationUpdateData(updateData, crystalUpdate);

    expect(updateData.system.storedMagicPoints).toEqual({ value: 12, max: 12, identified: true });
    expect(updateData.effects[0].system.changes).toEqual([]);
  });
});
