import { afterEach, describe, expect, it, vi } from "vitest";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

/**
 * Install the Foundry globals `RqgActiveEffect` needs at class-definition time, then import it.
 * The import must happen after the stubs, hence the dynamic import and `vi.resetModules()` in
 * `afterEach`. Returns the subject plus the stub, so tests can assert native delegation.
 */
async function loadSubject() {
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
  (globalThis as any).Item = class Item {};

  const { RqgActiveEffect } = await import("./rqg-active-effect");
  return { RqgActiveEffect, ActiveEffectStub, warn: vi.mocked(ui.notifications!.warn) };
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

// Mirrors core's DataField#applyChange dispatch closely enough to matter here: unknown/custom
// types fall to DataField#_applyChangeCustom, which fires a hook nobody listens to and returns
// undefined - and applyChangeField then writes nothing.
function fieldApplyChange(value: number, _doc: unknown, change: any): number | undefined {
  const delta = Number(change.value);
  switch (change.type) {
    case "add":
      return value + delta;
    case "multiply":
      return value * delta;
    case "upgrade":
      return Math.max(value, delta);
    default:
      return undefined;
  }
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
        fieldPath === "effect.add.melee.attack" ? { applyChange: fieldApplyChange } : undefined,
      ),
      effect: effectData,
    },
    ...overrides,
  };
}

const originalItem = (globalThis as any).Item;
const originalActiveEffect = (globalThis as any).ActiveEffect;

afterEach(() => {
  (globalThis as any).Item = originalItem;
  (globalThis as any).ActiveEffect = originalActiveEffect;
  vi.mocked(ui.notifications!.warn).mockClear();
  vi.resetModules();
});

describe("RqgActiveEffect.applyChange", () => {
  it("delegates non-routed keys straight to the native implementation", async () => {
    const { RqgActiveEffect, ActiveEffectStub } = await loadSubject();

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
    const { RqgActiveEffect } = await loadSubject();

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
    const { RqgActiveEffect } = await loadSubject();

    const item = makeWeaponItem();
    Object.setPrototypeOf(item, (globalThis as any).Item.prototype);
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
    const { RqgActiveEffect, warn } = await loadSubject();

    const applyChangeSpy = vi.fn(
      (value: number, _doc: unknown, change: any) => value * Number(change.value),
    );
    const item = makeWeaponItem();
    item.system.getFieldForProperty = vi.fn((fieldPath: string) =>
      fieldPath === "effect.add.melee.attack" ? { applyChange: applyChangeSpy } : undefined,
    );
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

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

  it("applies a routed key left on CUSTOM mode as ADD instead of silently dropping it", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const item = makeWeaponItem();
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect.applyChange(actor, {
      key: "@i.weapon.short-spear:system.effect.add.melee.attack",
      type: "custom",
      phase: "initial",
      priority: 0,
      value: "7",
    } as any);

    // core's field-level custom handler would have written nothing at all
    expect(item.system.effect.add.melee.attack).toBe(7);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("RqgActiveEffect._applyChangeCustom (deprecated legacy shim)", () => {
  it("still applies writes via the legacy 'rqid:path' syntax, forcing add", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

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
    // the deprecation notice is console-only - a GM cannot fix pack content from a toast
    expect(warn).not.toHaveBeenCalled();
  });
});
