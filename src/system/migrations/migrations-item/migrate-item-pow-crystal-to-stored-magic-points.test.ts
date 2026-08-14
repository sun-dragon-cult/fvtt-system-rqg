import { describe, it, expect, vi } from "vitest";
import { migrateItemPowCrystalToStoredMagicPoints } from "./migrate-item-pow-crystal-to-stored-magic-points";
import type { RqgItem } from "@items/rqg-item.ts";

describe("migrateItemPowCrystalToStoredMagicPoints", () => {
  it("sums matching AE changes into storedMagicPoints and strips them from the effect", async () => {
    const mockItem = {
      name: "POW Crystal",
      id: "item-1",
      type: "gear",
      system: { storedMagicPoints: { value: null, max: 0 } },
      effects: [
        {
          id: "effect-1",
          name: "POW Crystal",
          system: {
            changes: [
              { key: "system.effect.add.magicPoints.max", type: "add", value: 3 },
              { key: "system.attributes.hitPoints.max", type: "add", value: 2 },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
    );

    expect((updateData.system as any).storedMagicPoints).toEqual({
      value: 3,
      max: 3,
      identified: true,
    });
    expect((updateData.effects as any[])?.[0]).toEqual({
      _id: "effect-1",
      system: { changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: 2 }] },
    });
  });

  it("sums matching changes across multiple effects", async () => {
    const mockItem = {
      name: "Big Crystal",
      id: "item-2",
      type: "weapon",
      system: { storedMagicPoints: { value: null, max: 0 } },
      effects: [
        {
          id: "effect-1",
          system: {
            changes: [{ key: "system.effect.add.magicPoints.max", type: "add", value: 3 }],
          },
        },
        {
          id: "effect-2",
          system: {
            changes: [{ key: "system.effect.add.magicPoints.max", type: "add", value: "2" }],
          },
        },
      ],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
    );

    expect((updateData.system as any).storedMagicPoints).toEqual({
      value: 5,
      max: 5,
      identified: true,
    });
  });

  it("does nothing for non-physical items", async () => {
    const mockItem = {
      name: "Some Skill",
      id: "item-3",
      type: "skill",
      system: {},
      effects: [
        {
          id: "effect-1",
          system: { changes: [{ key: "system.effect.add.magicPoints.max", value: 3 }] },
        },
      ],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
    );

    expect(updateData).toEqual({});
  });

  it("does nothing when there is no matching AE change", async () => {
    const mockItem = {
      name: "Plain Gear",
      id: "item-4",
      type: "gear",
      system: { storedMagicPoints: { value: null, max: 0 } },
      effects: [{ id: "effect-1", system: { changes: [{ key: "system.other.field", value: 3 }] } }],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
    );

    expect(updateData).toEqual({});
  });

  it("does not clobber an item that already has a configured storedMagicPoints.max", async () => {
    const mockItem = {
      name: "Already Migrated Crystal",
      id: "item-5",
      type: "gear",
      system: { storedMagicPoints: { value: 2, max: 5 } },
      effects: [
        {
          id: "effect-1",
          system: { changes: [{ key: "system.effect.add.magicPoints.max", value: 3 }] },
        },
      ],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
    );

    expect(updateData).toEqual({});
  });

  it("skips non-ADD-mode changes instead of summing them, leaving them for manual review", async () => {
    const warn = vi.fn();
    const info = vi.fn();
    const mockItem = {
      name: "Weird Crystal",
      id: "item-6",
      uuid: "Item.item-6",
      type: "gear",
      system: { storedMagicPoints: { value: null, max: 0 } },
      effects: [
        {
          id: "effect-1",
          system: {
            changes: [
              { key: "system.effect.add.magicPoints.max", type: "add", value: 3 },
              { key: "system.effect.add.magicPoints.max", type: "override", value: 99 },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
      undefined,
      { warn, info } as any,
    );

    expect((updateData.system as any).storedMagicPoints).toEqual({
      value: 3,
      max: 3,
      identified: true,
    });
    expect((updateData.effects as any[])?.[0]).toEqual({
      _id: "effect-1",
      system: {
        changes: [{ key: "system.effect.add.magicPoints.max", type: "override", value: 99 }],
      },
    });
    expect(warn).toHaveBeenCalled();
  });

  it("does nothing when the only matching change is non-ADD-mode", async () => {
    const mockItem = {
      name: "Override-only Crystal",
      id: "item-7",
      type: "gear",
      system: { storedMagicPoints: { value: null, max: 0 } },
      effects: [
        {
          id: "effect-1",
          system: {
            changes: [{ key: "system.effect.add.magicPoints.max", type: "override", value: 5 }],
          },
        },
      ],
    };

    const updateData = await migrateItemPowCrystalToStoredMagicPoints(
      mockItem as unknown as RqgItem,
    );

    expect(updateData).toEqual({});
  });
});
