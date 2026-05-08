import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RqgItem } from "@items/rqgItem.ts";
import { migrateItemActiveEffectTypes } from "./migrateItemActiveEffectTypes";

describe("migrateItemActiveEffectTypes", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should normalize malformed custom.20 type to custom", async () => {
    const mockItem = {
      name: "Malformed Type Item",
      id: "item-malformed-type-1",
      effects: [
        {
          id: "effect-1",
          name: "Malformed Type Effect",
          system: {
            changes: [
              {
                key: "system.attributes.magicPoints.max",
                type: "custom.20",
                value: "5",
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectTypes(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].type).toBe("custom");
    expect((updateData.effects as any[])?.[0].system.changes[0].value).toBe("5");
  });

  it("should normalize single-digit numeric mode values to canonical string type", async () => {
    const mockItem = {
      name: "Numeric Type Item",
      id: "item-numeric-type-1",
      effects: [
        {
          id: "effect-1",
          name: "Numeric Type Effect",
          system: {
            changes: [
              {
                key: "system.attributes.magicPoints.max",
                type: 2,
                value: "6",
              },
            ],
          },
        },
      ],
    };

    const updateData = await migrateItemActiveEffectTypes(mockItem as unknown as RqgItem);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].type).toBe("add");
  });
});
