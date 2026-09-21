import { afterEach, describe, expect, it, vi } from "vitest";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

/**
 * Install the Foundry globals `RqgActiveEffect` needs at class-definition time, then import it.
 * The import must happen after the stubs, hence the dynamic import and `vi.resetModules()` in
 * `afterEach`. Returns the subject plus the stub, so tests can assert native delegation.
 */
class DataModelStub {}

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

    static _applyChangeCustom = vi.fn();
  }
  (globalThis as any).ActiveEffect = ActiveEffectStub;
  (globalThis as any).Item = class Item {};
  // the shared mock has no foundry.abstract.DataModel, which the routed field lookup guards on
  (globalThis as any).foundry.abstract.DataModel = DataModelStub;

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

// Mirrors core's DataField#applyChange dispatch. The default branch matters most: an unhandled
// type falls to DataField#_applyChangeCustom, which fires a hook nobody listens to and returns
// undefined, and applyChange then *cleans* that undefined to the field's initial value and hands
// it back - so applyChangeField writes a 0 over whatever was there. Modelled here so a routed
// change with a non-native type can be shown to wipe the target if it is not filtered out.
const FIELD_INITIAL = 0;

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
      return FIELD_INITIAL;
  }
}

function makeWeaponItem(overrides: Record<string, unknown> = {}) {
  const effectData = {
    add: {
      melee: { attack: 0, parry: 0 },
      missile: { attack: 0, parry: 0 },
    },
  };
  // routing guards with `system instanceof foundry.abstract.DataModel`, like core does
  const system = Object.create(DataModelStub.prototype);
  Object.assign(system, {
    getFieldForProperty: vi.fn((fieldPath: string) =>
      fieldPath === "effect.add.melee.attack" ? { applyChange: fieldApplyChange } : undefined,
    ),
    effect: effectData,
  });
  return {
    id: "weapon1",
    name: "Short Spear",
    type: "weapon",
    system,
    ...overrides,
  };
}

const originalItem = (globalThis as any).Item;
const originalActiveEffect = (globalThis as any).ActiveEffect;
const originalDataModel = (globalThis as any).foundry.abstract.DataModel;

afterEach(() => {
  (globalThis as any).Item = originalItem;
  (globalThis as any).ActiveEffect = originalActiveEffect;
  (globalThis as any).foundry.abstract.DataModel = originalDataModel;
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
  it("warns and skips a non-native change type instead of resetting the field", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const item = makeWeaponItem();
    item.system.effect.add.melee.attack = 4;
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect.applyChange(actor, {
      key: "@i.weapon.short-spear:system.effect.add.melee.attack",
      type: "somemodule.special",
      phase: "initial",
      priority: 0,
      value: "5",
    } as any);

    // core would fall through to DataField#_applyChangeCustom, whose undefined return is cleaned
    // to the field's initial value and then written - silently wiping the pad
    expect(item.system.effect.add.melee.attack).toBe(4);
    expect(item.system.getFieldForProperty).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("skips a fanned-out target whose system is not a DataModel rather than throwing", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const foreignItem = { id: "foreign", name: "Module Item", type: "module-thing", system: {} };
    const item = makeWeaponItem();
    const actor = makeCharacterActor({
      getEmbeddedDocumentsByRqidRegex: vi.fn(() => [foreignItem, item]),
    });

    expect(() =>
      RqgActiveEffect.applyChange(actor, {
        key: "@~^i\\.weapon\\.:system.effect.add.melee.attack",
        type: "add",
        phase: "initial",
        priority: 0,
        value: "5",
      } as any),
    ).not.toThrow();

    // the well-formed sibling still gets its change
    expect(item.system.effect.add.melee.attack).toBe(5);
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

  it("warns about a bare rqid with no system path instead of silently dropping it", async () => {
    const { RqgActiveEffect, ActiveEffectStub, warn } = await loadSubject();

    const actor = makeCharacterActor();
    RqgActiveEffect._applyChangeCustom(
      actor,
      {
        key: "i.skill.worship-etyries",
        type: "custom",
        phase: "initial",
        priority: 20,
        value: "20",
      } as any,
      undefined,
      undefined,
      {} as any,
    );

    // the selector is a valid rqid, so this was meant as a routed key - say what is missing
    expect(warn).toHaveBeenCalledTimes(1);
    expect(ActiveEffectStub._applyChangeCustom).not.toHaveBeenCalled();
  });

  it("warns when a legacy key's path is not a system path", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const actor = makeCharacterActor();
    RqgActiveEffect._applyChangeCustom(
      actor,
      {
        key: "i.skill.dodge:baseChance",
        type: "custom",
        phase: "initial",
        priority: 0,
        value: "5",
      } as any,
      undefined,
      undefined,
      {} as any,
    );

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("delegates a change that is not RQG's legacy syntax back to core", async () => {
    const { RqgActiveEffect, ActiveEffectStub, warn } = await loadSubject();

    const actor = makeCharacterActor();
    const change = {
      key: "flags.someModule.someFlag",
      type: "custom",
      phase: "initial",
      priority: 0,
      value: "1",
    };
    const changes = {};
    RqgActiveEffect._applyChangeCustom(actor, change as any, 1, 2, changes as any);

    // core sends every unresolvable CUSTOM change here, so a module's applyActiveEffect hook
    // effect must keep working - and must not be told to rewrite itself as an rqid key
    expect(ActiveEffectStub._applyChangeCustom).toHaveBeenCalledWith(actor, change, 1, 2, changes);
    expect(actor.getBestEmbeddedDocumentByRqid).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
