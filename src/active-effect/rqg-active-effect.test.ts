import { describe, expect, it, vi } from "vitest";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

describe("RqgActiveEffect._applyChangeCustom", () => {
  it("preserves writes to nested non-persisted item effect fields", async () => {
    (globalThis as any).ActiveEffect ??= class ActiveEffect {};
    ((globalThis as any).ActiveEffect as any).SubType ??= {};

    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const effectData = {
      melee: { attack: 0, parry: 0 },
      missile: { attack: 0, parry: 0 },
    };

    const system = {
      schema: {
        getField: vi.fn(() => ({
          persisted: false,
          applyChange: vi.fn((currentValue: number) => currentValue + 50),
        })),
      },
      get effect() {
        return structuredClone(effectData);
      },
    };

    const item = {
      name: "Short Spear",
      type: "weapon",
      system,
    };

    const actor = {
      type: ActorTypeEnum.Character,
      name: "Test Actor",
      getBestEmbeddedDocumentByRqid: vi.fn(() => item),
      getRollData: vi.fn(() => ({})),
    };

    RqgActiveEffect._applyChangeCustom(
      actor as any,
      {
        key: "i.weapon.short-spear:system.effect.melee.attack",
        mode: 0 as any,
        priority: 0,
        value: "50",
      },
      undefined,
      undefined,
      {} as any,
    );

    expect(actor.getBestEmbeddedDocumentByRqid).toHaveBeenCalledWith("i.weapon.short-spear");
    expect(item.system.effect.melee.attack).toBe(50);
  });
});
