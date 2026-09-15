import { afterEach, describe, expect, it, vi } from "vitest";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

function installActiveEffectStub() {
  class ActiveEffectStub {
    static SubType = {};

    static applyChangeField(targetDoc: object, change: ActiveEffect.ChangeData, options: any) {
      const current = foundry.utils.getProperty(targetDoc, change.key ?? "");
      const update = options.field.applyChange(current, targetDoc, change, {
        replacementData: options.replacementData,
      });
      if (options.modifyTarget !== false && update !== undefined) {
        foundry.utils.setProperty(targetDoc, change.key ?? "", update);
      }
      return update;
    }

    static applyChange = vi.fn(() => ({ __nativeApplyChangeCalled: true }));
  }
  (globalThis as any).ActiveEffect = ActiveEffectStub;
  return ActiveEffectStub;
}

function makeCharacterActor(overrides: Record<string, unknown> = {}) {
  const actor = Object.create((globalThis as any).Actor.prototype);
  return Object.assign(actor, {
    type: ActorTypeEnum.Character,
    name: "Test Actor",
    getBestEmbeddedDocumentByRqid: vi.fn(() => undefined),
    getEmbeddedDocumentsByRqidRegex: vi.fn(() => []),
    getRollData: vi.fn(() => ({})),
    ...overrides,
  });
}

function makeWeaponItem(overrides: Record<string, unknown> = {}) {
  const effectData = {
    add: {
      melee: { attack: 0, parry: 0 },
      missile: { attack: 0, parry: 0 },
    },
  };
  return {
    id: "weapon1",
    name: "Short Spear",
    type: "weapon",
    system: {
      getFieldForProperty: vi.fn((fieldPath: string) =>
        fieldPath === "effect.add.melee.attack"
          ? {
              applyChange: (value: number, _doc: unknown, change: any) =>
                value + Number(change.value),
            }
          : undefined,
      ),
      effect: effectData,
    },
    ...overrides,
  };
}

const originalItem = (globalThis as any).Item;

afterEach(() => {
  (globalThis as any).Item = originalItem;
  vi.resetModules();
});

describe("RqgActiveEffect.applyChange", () => {
  it("delegates non-routed keys straight to the native implementation", async () => {
    const ActiveEffectStub = installActiveEffectStub();
    (globalThis as any).Item = class Item {};
    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const actor = makeCharacterActor();
    const change = {
      key: "system.baseChance",
      type: "add",
      phase: "initial",
      priority: 0,
      value: "10",
    };
    const result = RqgActiveEffect.applyChange(actor, change as any);

    expect(ActiveEffectStub.applyChange).toHaveBeenCalledWith(actor, change, undefined);
    expect(result).toEqual({ __nativeApplyChangeCalled: true });
    expect(actor.getBestEmbeddedDocumentByRqid).not.toHaveBeenCalled();
  });

  it("routes an @rqid key to the matching embedded item, honouring the change's own mode", async () => {
    installActiveEffectStub();
    (globalThis as any).Item = class Item {};
    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const item = makeWeaponItem();
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect.applyChange(
      actor,
      {
        key: "@i.weapon.short-spear:system.effect.add.melee.attack",
        type: "add",
        phase: "initial",
        priority: 0,
        value: "5",
      } as any,
      { replacementData: { foo: "bar" } },
    );

    expect(actor.getBestEmbeddedDocumentByRqid).toHaveBeenCalledWith("i.weapon.short-spear");
    expect(item.system.getFieldForProperty).toHaveBeenCalledWith("effect.add.melee.attack");
    expect(item.system.effect.add.melee.attack).toBe(5);
  });

  it("routes @. to the effect's owning item without touching the actor lookup", async () => {
    installActiveEffectStub();
    (globalThis as any).Item = class Item {};
    const item = makeWeaponItem();
    Object.setPrototypeOf(item, (globalThis as any).Item.prototype);
    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const actor = makeCharacterActor();
    const effect = { parent: item, uuid: "Effect.abc", disabled: false };

    RqgActiveEffect.applyChange(actor, {
      key: "@.:system.effect.add.melee.attack",
      type: "add",
      phase: "initial",
      priority: 0,
      value: "3",
      effect,
    } as any);

    expect(actor.getBestEmbeddedDocumentByRqid).not.toHaveBeenCalled();
    expect(item.system.effect.add.melee.attack).toBe(3);
  });

  it("warns once and does not apply MULTIPLY against a pad", async () => {
    installActiveEffectStub();
    (globalThis as any).Item = class Item {};
    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const applyChangeSpy = vi.fn(
      (value: number, _doc: unknown, change: any) => value * Number(change.value),
    );
    const item = makeWeaponItem();
    item.system.getFieldForProperty = vi.fn((fieldPath: string) =>
      fieldPath === "effect.add.melee.attack" ? { applyChange: applyChangeSpy } : undefined,
    );
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });
    const warn = vi.fn();
    (globalThis as any).ui = { notifications: { warn } };

    RqgActiveEffect.applyChange(actor, {
      key: "@i.weapon.short-spear:system.effect.add.melee.attack",
      type: "multiply",
      phase: "initial",
      priority: 0,
      value: "2",
    } as any);

    expect(applyChangeSpy).not.toHaveBeenCalled();
    expect(item.system.effect.add.melee.attack).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("RqgActiveEffect._applyChangeCustom (deprecated legacy shim)", () => {
  it("still applies writes via the legacy 'rqid:path' syntax, forcing add", async () => {
    installActiveEffectStub();
    (globalThis as any).Item = class Item {};
    const { RqgActiveEffect } = await import("./rqg-active-effect");

    const item = makeWeaponItem();
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect._applyChangeCustom(
      actor,
      {
        key: "i.weapon.short-spear:system.effect.add.melee.attack",
        type: "custom",
        phase: "initial",
        priority: 0,
        value: "50",
      } as any,
      undefined,
      undefined,
      {} as any,
    );

    expect(actor.getBestEmbeddedDocumentByRqid).toHaveBeenCalledWith("i.weapon.short-spear");
    expect(item.system.getFieldForProperty).toHaveBeenCalledWith("effect.add.melee.attack");
    expect(item.system.effect.add.melee.attack).toBe(50);
  });
});
