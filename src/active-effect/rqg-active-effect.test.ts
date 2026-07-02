import { describe, expect, it, vi } from "vitest";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

describe("RqgActiveEffect._applyChangeCustom", () => {
  it("applies writes to nested non-persisted item effect fields", async () => {
    (globalThis as any).ActiveEffect ??= class ActiveEffect {};
    const activeEffectClass = (globalThis as any).ActiveEffect as any;
    activeEffectClass.SubType ??= {};
    activeEffectClass.applyChangeField ??= vi.fn(
      (targetDoc: object, change: ActiveEffect.ChangeData, options: any) => {
        const current = foundry.utils.getProperty(targetDoc, change.key ?? "");
        const update = options.field.applyChange(current, targetDoc, change, {
          replacementData: options.replacementData,
        });
        if (options.modifyTarget && update !== undefined) {
          foundry.utils.setProperty(targetDoc, change.key ?? "", update);
        }
        return update;
      },
    );

    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const effectData = {
      melee: { attack: 0, parry: 0 },
      missile: { attack: 0, parry: 0 },
    };

    const applyChange = vi.fn((currentValue: number) => currentValue + 50);
    const system = {
      getFieldForProperty: vi.fn((fieldPath: string) =>
        fieldPath === "effect.melee.attack" ? { applyChange } : undefined,
      ),
      effect: effectData,
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
    expect(system.getFieldForProperty).toHaveBeenCalledWith("effect.melee.attack");
    expect(applyChange).toHaveBeenCalled();
    expect(item.system.effect.melee.attack).toBe(50);
  });
});
