import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { migrateActorActiveEffectTypes } from "./migrate-actor-active-effect-types";

describe("migrateActorActiveEffectTypes", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should normalize malformed custom.20 type to custom on actor-owned effects", () => {
    const mockActor = {
      name: "Malformed Type Actor",
      id: "actor-malformed-type-1",
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
      items: [],
    };

    const updateData = migrateActorActiveEffectTypes(mockActor as unknown as RqgActor);

    expect(updateData.effects).toBeDefined();
    expect((updateData.effects as any[])?.[0].system.changes[0].type).toBe("custom");
  });
});
