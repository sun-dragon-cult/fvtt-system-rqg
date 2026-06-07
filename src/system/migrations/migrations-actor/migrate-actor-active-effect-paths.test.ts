import { describe, it, expect, beforeEach, vi } from "vitest";
import { migrateActorActiveEffectPaths } from "./migrate-actor-active-effect-paths";
import type { RqgActor } from "@actors/rqg-actor.ts";

describe("migrateActorActiveEffectPaths", () => {
  beforeEach(() => {
    // Mock console.log to avoid noise
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should migrate legacy actor effect paths", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
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
      items: new Map(),
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
  });

  it("should migrate hitPoints.max to system.effect.hitPoints.max", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
      effects: new Map([
        [
          "effect-1",
          {
            id: "effect-1",
            name: "Test Effect",
            system: {
              changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: 10 }],
            },
          },
        ],
      ]),
      items: new Map(),
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.hitPoints.max",
    );
  });

  it("should skip already migrated effects", () => {
    const migratedEffect = {
      id: "effect-1",
      name: "Test Effect",
      system: {
        changes: [{ key: "system.effect.magicPoints.max", type: "add", value: 5 }],
      },
    };

    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
      effects: new Map([["effect-1", migratedEffect]]),
      items: new Map(),
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    // Should not include effects in updateData if nothing changed
    expect(updateData.effects).toBeUndefined();
  });

  it("should only migrate ADD-type changes", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
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
      items: new Map(),
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.magicPoints.max",
    );
    expect((updateData.effects as any[])?.[0].system.changes[1].key).toBe(
      "system.attributes.hitPoints.max", // Unchanged
    );
  });

  it("should not migrate effects on embedded items", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
      effects: new Map(),
      items: new Map([
        [
          "item-1",
          {
            id: "item-1",
            name: "Test Item",
            effects: new Map([
              [
                "effect-1",
                {
                  id: "effect-1",
                  name: "Item Effect",
                  changes: [{ key: "system.attributes.magicPoints.max", type: "add", value: 3 }],
                },
              ],
            ]),
          },
        ],
      ]),
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect((updateData as any)._itemEffectUpdates).toBeUndefined();
    expect(updateData.effects).toBeUndefined();
  });

  it("should return empty updateData if nothing to migrate", () => {
    const mockActor = {
      name: "Test Actor",
      id: "actor-1",
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
      items: new Map(),
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeUndefined();
  });

  it("should migrate legacy paths when actor effects are provided as an array", () => {
    const mockActor = {
      name: "Actor Data",
      id: "actor-array-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy Actor Effect",
          system: {
            changes: [{ key: "system.attributes.hitPoints.max", type: "add", value: 3 }],
          },
        },
      ],
      items: [],
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "system.effect.hitPoints.max",
    );
  });

  it("should migrate legacy itemType:itemName key syntax to rqid when actor match is unique", () => {
    const mockActor = {
      name: "Actor Data",
      id: "actor-legacy-key-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy Key Effect",
          system: {
            changes: [{ key: "skill:Dodge:system.baseChance", type: "add", value: 3 }],
          },
        },
      ],
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

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].key).toBe(
      "i.skill.dodge:system.baseChance",
    );
  });

  it("should keep legacy itemType:itemName key when actor match is ambiguous", () => {
    const mockActor = {
      name: "Actor Data",
      id: "actor-legacy-key-ambiguous-1",
      effects: [
        {
          id: "effect-1",
          name: "Legacy Key Effect",
          system: {
            changes: [{ key: "skill:Dodge:system.baseChance", type: "add", value: 3 }],
          },
        },
      ],
      items: [
        {
          id: "item-1",
          type: "skill",
          name: "Dodge",
          flags: { rqg: { documentRqidFlags: { id: "i.skill.dodge-a" } } },
        },
        {
          id: "item-2",
          type: "skill",
          name: "Dodge",
          flags: { rqg: { documentRqidFlags: { id: "i.skill.dodge-b" } } },
        },
      ],
    };

    const updateData = migrateActorActiveEffectPaths(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeUndefined();
  });
});
