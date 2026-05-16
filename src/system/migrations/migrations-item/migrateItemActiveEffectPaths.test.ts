import { describe, it, expect, beforeEach, vi } from "vitest";
import { migrateItemActiveEffectPaths } from "./migrateItemActiveEffectPaths";
import type { RqgItem } from "@items/rqgItem.ts";

describe("migrateItemActiveEffectPaths", () => {
  beforeEach(() => {
    // Mock console.log to avoid noise
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should migrate legacy item effect paths", async () => {
    const mockItem = {
      name: "Test Item",
      id: "item-1",
      effects: new Map([
        [
          "effect-1",
          {
            id: "effect-1",
            name: "Test Effect",
            system: {
              changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: 5 }],
            },
          },
        ],
      ]),
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should migrate hitPoints.max to system.effect.hitPoints.max and normalize value", async () => {
    const mockItem = {
      name: "Hit Points Item",
      id: "item-hp-1",
      effects: [
        {
          id: "effect-1",
          name: "Hit Points Effect",
          system: {
            changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: "10" }],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.hitPoints.max",
    );
    expect((updateData.effects as any[])?.[0].system.changes[0].value).toBe(10);
  });

  it("should skip already migrated effects", async () => {
    const migratedEffect = {
      id: "effect-1",
      name: "Test Effect",
      system: {
        changes: [{ key: "system.effect.magicPoints.max", type: "add", value: 5 }],
      },
    };

    const mockItem = {
      name: "Test Item",
      id: "item-1",
      effects: new Map([["effect-1", migratedEffect]]),
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeUndefined();
  });

  it("should only migrate ADD-type changes", async () => {
    const mockItem = {
      name: "Test Item",
      id: "item-1",
      effects: new Map([
        [
          "effect-1",
          {
            id: "effect-1",
            name: "Test Effect",
            system: {
              changes: [
                { key: "system.attributes.magicPoints.max", type: "add", value: 5 }, // ADD type - should migrate
                { key: "system.attributes.hitPoints.max", type: "multiply", value: 10 }, // Non-ADD type - should not migrate
              ],
            },
          },
        ],
      ]),
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
    expect((updateData.effects as any[])?.[0].system.changes[1].key).toBe(
      "system.attributes.hitPoints.max", // Unchanged
    );
  });

  it("should return empty updateData if nothing to migrate", async () => {
    const mockItem = {
      name: "Test Item",
      id: "item-1",
      effects: new Map([
        [
          "effect-1",
          {
            id: "effect-1",
            name: "Test Effect",
            system: {
              changes: [{ key: "system.other.field", type: "add", value: 5 }],
            },
          },
        ],
      ]),
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeUndefined();
  });

  it("should migrate legacy paths when effects are provided as an array", async () => {
    const mockItem = {
      name: "Embedded Item Data",
      id: "item-embedded-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy Effect",
          system: {
            changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: 5 }],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should normalize undefined ADD value on already-migrated key", async () => {
    const mockItem = {
      name: "Broken Migrated Item",
      id: "item-broken-1",
      effects: [
        {
          id: "effect-1",
          name: "Broken Effect",
          system: {
            changes: [
              {
                key: "system.effect.magicPoints.max",
                type: "add",
                value: undefined,
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].value).toBe(0);
  });

  it("should not migrate legacy key when type is missing", async () => {
    const mockItem = {
      name: "Missing Mode Item",
      id: "item-missing-mode-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy No-Mode Effect",
          system: {
            changes: [
              {
                key: "system.attributes.magicPoints.max",
                value: undefined,
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeUndefined();
  });

  it("should strip transient effect back-reference from migrated changes", async () => {
    const mockItem = {
      name: "Transient Field Item",
      id: "item-transient-1",
      effects: [
        {
          id: "effect-1",
          name: "Transient Change Effect",
          system: {
            changes: [
              {
                effect: { _id: "effect-1", name: "Transient Change Effect" },
                key: "system.attributes.magicPoints.max",
                type: "add",
                value: 12,
                phase: "initial",
                priority: 0,
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].effect).toBeUndefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should migrate when system.changes exists and top-level changes is empty", async () => {
    const mockItem = {
      name: "Mixed Changes Container Item",
      id: "item-mixed-containers-1",
      effects: [
        {
          id: "effect-1",
          name: "Mixed Container Effect",
          changes: [],
          system: {
            changes: [
              {
                key: "system.attributes.magicPoints.max",
                type: "add",
                value: 4,
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should migrate document-like effects via toObject source", async () => {
    const mockItem = {
      name: "Document Shape Item",
      id: "item-doc-shape-1",
      effects: [
        {
          id: "effect-1",
          name: "Doc Effect",
          toObject: () => ({
            _id: "effect-1",
            name: "Doc Effect",
            system: {
              changes: [
                {
                  key: "system.attributes.magicPoints.max",
                  type: "add",
                  value: 2,
                },
              ],
            },
          }),
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0]._id).toBe("effect-1");
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should migrate effects with system.changes only", async () => {
    const mockItem = {
      name: "Canonical Changes Item",
      id: "item-canonical-1",
      effects: [
        {
          id: "effect-1",
          name: "Canonical Effect",
          system: {
            changes: [
              {
                key: "system.attributes.magicPoints.max",
                type: "add",
                value: 3,
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should ignore top-level changes when both exist (canonical takes precedence)", async () => {
    const mockItem = {
      name: "Conflicting Changes Item",
      id: "item-conflicting-2",
      effects: [
        {
          id: "effect-1",
          name: "Conflicting Effect",
          changes: [
            {
              key: "system.other.field",
              type: "add",
              value: 99,
            },
          ],
          system: {
            changes: [
              {
                key: "system.attributes.magicPoints.max",
                type: "add",
                value: 3,
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
    expect(Array.isArray(mockItem.effects)).toBe(true);
    expect((mockItem.effects as any[])[0].changes).toEqual([
      {
        key: "system.other.field",
        type: "add",
        value: 99,
      },
    ]);
  });

  it("should migrate legacy itemType:itemName syntax using owning actor context", async () => {
    const mockItem = {
      name: "Embedded Item Data",
      id: "item-legacy-key-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy Key Effect",
          system: {
            changes: [{ key: "skill:Dodge:system.baseChance", type: "add", value: 5 }],
          },
        },
      ],
    };

    const mockOwningActor = {
      items: [
        {
          id: "item-1",
          type: "skill",
          name: "Dodge",
          flags: {
            rqg: {
              documentRqidFlags: {
                id: "i.skill.dodge",
              },
            },
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(
      mockItem as unknown as RqgItem,
      mockOwningActor as any,
    );

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "i.skill.dodge:system.baseChance",
    );
  });

  it("should not migrate legacy itemType:itemName syntax without owning actor context", async () => {
    const mockItem = {
      name: "Embedded Item Data",
      id: "item-legacy-key-no-actor-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy Key Effect",
          system: {
            changes: [{ key: "skill:Dodge:system.baseChance", type: "add", value: 5 }],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectPaths(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeUndefined();
  });
});
