import { describe, expect, it } from "vitest";
import { migrateActiveEffectActiveEffectPaths } from "./migrate-active-effect-active-effect-paths";

function makeCompendiumEffect(sourceChanges: Record<string, unknown>[]) {
  // prepared data, as core's prepareBaseData leaves it: CUSTOM's default priority filled in
  const preparedChanges = sourceChanges.map((c) => ({ ...c, priority: c["priority"] ?? 0 }));
  return {
    name: "Bladesharp",
    uuid: "Compendium.world.spells.ActiveEffect.abc",
    system: { changes: preparedChanges },
    toObject: () => ({ system: { changes: structuredClone(sourceChanges) } }),
  };
}

describe("migrateActiveEffectActiveEffectPaths", () => {
  it("rewrites from source data, so the prepared default priority is not persisted", async () => {
    const effect = makeCompendiumEffect([
      {
        key: "i.weapon.broadsword:system.effect.add.melee.attack",
        type: "custom",
        value: 10,
        priority: null,
      },
    ]);

    const updateData = await migrateActiveEffectActiveEffectPaths(effect as any, undefined as any);

    expect((updateData.system as any).changes).toEqual([
      {
        key: "@i.weapon.broadsword:system.effect.add.melee.attack",
        type: "add",
        value: 10,
        priority: null,
      },
    ]);
    expect(effect.system.changes[0]).toMatchObject({
      key: "i.weapon.broadsword:system.effect.add.melee.attack",
    });
  });

  it("returns no update when nothing needs migrating", async () => {
    const effect = makeCompendiumEffect([
      {
        key: "@i.weapon.broadsword:system.effect.add.melee.attack",
        type: "add",
        value: 10,
        priority: null,
      },
    ]);

    const updateData = await migrateActiveEffectActiveEffectPaths(effect as any, undefined as any);

    expect(updateData).toEqual({});
  });
});
