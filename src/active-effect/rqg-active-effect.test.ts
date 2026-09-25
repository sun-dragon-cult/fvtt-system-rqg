import { afterEach, describe, expect, it, vi } from "vitest";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

class DataModelStub {}

/** Install the globals the class needs at definition time, then import it - hence the dynamic import. */
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

function routedChange(key: string, type: string, value: string, extra: object = {}) {
  return { key, type, phase: "initial", priority: 0, value, ...extra } as any;
}

function applyLegacyCustom(subject: any, actor: object, key: string, value: string) {
  subject._applyChangeCustom(actor, routedChange(key, "custom", value), undefined, undefined, {});
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

// Mirrors core's DataField#applyChange dispatch, including the default branch cleaning an
// unhandled type's undefined to the field's initial - i.e. wiping whatever was there.
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
    const change = routedChange("system.baseChance", "add", "10");
    const result = RqgActiveEffect.applyChange(actor, change);

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
      routedChange("@i.weapon.short-spear:system.effect.add.melee.attack", "add", "5"),
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

    RqgActiveEffect.applyChange(
      actor,
      routedChange("@.:system.effect.add.melee.attack", "add", "3", { effect }),
    );

    expect(actor.getBestEmbeddedDocumentByRqid).not.toHaveBeenCalled();
    expect(item.system.effect.add.melee.attack).toBe(3);
  });

  it("applies MULTIPLY to a pad natively, so it acts on whatever has accumulated", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const item = makeWeaponItem();
    item.system.effect.add.melee.attack = 5;
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect.applyChange(
      actor,
      routedChange("@i.weapon.short-spear:system.effect.add.melee.attack", "multiply", "2"),
    );

    expect(item.system.effect.add.melee.attack).toBe(10);
    expect(warn).not.toHaveBeenCalled();
  });

  it("names the effect's uuid in the console warning, so copies with one _id can be told apart", async () => {
    const { RqgActiveEffect } = await loadSubject();
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const actor = makeCharacterActor();
    const effect = { parent: actor, uuid: "Actor.a1.ActiveEffect.e1", disabled: false };
    RqgActiveEffect.applyChange(
      actor,
      routedChange("@.:system.effect.add.melee.attack", "add", "1", { effect }),
    );

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn.mock.calls[0]).toContain("Actor.a1.ActiveEffect.e1");
    consoleWarn.mockRestore();
  });

  it("logs but does not toast for an unlinked token's copy of an effect", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const tokenActor = makeCharacterActor({ isToken: true });
    const effect = {
      parent: tokenActor,
      uuid: "Scene.s1.Token.t1.Actor.a1.ActiveEffect.e1",
      disabled: false,
    };
    RqgActiveEffect.applyChange(
      tokenActor,
      routedChange("@.:system.effect.add.melee.attack", "add", "1", { effect }),
    );

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it("folds warnings raised before the UI exists into one GM summary at ready", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();
    const readyCallbacks: Array<() => void> = [];
    (globalThis as any).Hooks = {
      once: vi.fn((hook: string, fn: () => void) => hook === "ready" && readyCallbacks.push(fn)),
    };
    const notifications = ui.notifications;
    (globalThis as any).ui.notifications = undefined;
    (globalThis as any).game.user = { isGM: true };
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const actor = makeCharacterActor();
      for (const id of ["e1", "e2"]) {
        const effect = { parent: actor, uuid: `Actor.a1.ActiveEffect.${id}`, disabled: false };
        RqgActiveEffect.applyChange(
          actor,
          routedChange("@.:system.effect.add.melee.attack", "add", "1", { effect }),
        );
      }
      (globalThis as any).ui.notifications = notifications;

      // both are logged at once, but no toast is attempted before the UI exists
      expect(consoleWarn).toHaveBeenCalledTimes(2);
      expect(warn).not.toHaveBeenCalled();
      expect(readyCallbacks).toHaveLength(1);

      readyCallbacks[0]!();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain("RoutedKey.LoadSummary");
      expect(warn.mock.calls[0]![0]).toContain("count,2");
    } finally {
      (globalThis as any).ui.notifications = notifications;
      delete (globalThis as any).game.user;
      delete (globalThis as any).Hooks;
      consoleWarn.mockRestore();
    }
  });

  it("applies a routed key left on CUSTOM mode as ADD instead of silently dropping it", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const item = makeWeaponItem();
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect.applyChange(
      actor,
      routedChange("@i.weapon.short-spear:system.effect.add.melee.attack", "custom", "7"),
    );

    // core's field-level custom handler would have written nothing at all
    expect(item.system.effect.add.melee.attack).toBe(7);
    expect(warn).toHaveBeenCalledTimes(1);
  });
  it("warns and skips a non-native change type instead of resetting the field", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const item = makeWeaponItem();
    item.system.effect.add.melee.attack = 4;
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    RqgActiveEffect.applyChange(
      actor,
      routedChange(
        "@i.weapon.short-spear:system.effect.add.melee.attack",
        "somemodule.special",
        "5",
      ),
    );

    // core would clean the undefined return to the field's initial and write it, wiping the pad
    expect(item.system.effect.add.melee.attack).toBe(4);
    expect(item.system.getFieldForProperty).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("skips a target whose system is not a DataModel without losing its siblings", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const foreignItem = { id: "foreign", name: "Module Item", type: "module-thing", system: {} };
    const item = makeWeaponItem();
    const actor = makeCharacterActor({
      getEmbeddedDocumentsByRqidRegex: vi.fn(() => [foreignItem, item]),
    });

    RqgActiveEffect.applyChange(
      actor,
      routedChange("@~^i\\.weapon\\.:system.effect.add.melee.attack", "add", "5"),
    );

    // without the guard the lookup throws into the catch, which logs without notifying
    expect(warn).toHaveBeenCalledTimes(1);
    // and the well-formed sibling still gets its change
    expect(item.system.effect.add.melee.attack).toBe(5);
  });
});

describe("RqgActiveEffect._applyChangeCustom (deprecated legacy shim)", () => {
  it("still applies writes via the legacy 'rqid:path' syntax, forcing add", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const item = makeWeaponItem();
    const actor = makeCharacterActor({ getBestEmbeddedDocumentByRqid: vi.fn(() => item) });

    applyLegacyCustom(
      RqgActiveEffect,
      actor,
      "i.weapon.short-spear:system.effect.add.melee.attack",
      "50",
    );

    expect(actor.getBestEmbeddedDocumentByRqid).toHaveBeenCalledWith("i.weapon.short-spear");
    expect(item.system.getFieldForProperty).toHaveBeenCalledWith("effect.add.melee.attack");
    expect(item.system.effect.add.melee.attack).toBe(50);
    // what the migration could not reach (locked packs, module content) is surfaced to be fixed
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("LegacySyntaxDeprecated");
  });

  it("warns about a bare rqid with no system path instead of silently dropping it", async () => {
    const { RqgActiveEffect, ActiveEffectStub, warn } = await loadSubject();

    const actor = makeCharacterActor();
    applyLegacyCustom(RqgActiveEffect, actor, "i.skill.worship-etyries", "20");

    // the selector is a valid rqid, so this was meant as a routed key - say what is missing
    expect(warn).toHaveBeenCalledTimes(1);
    expect(ActiveEffectStub._applyChangeCustom).not.toHaveBeenCalled();
  });

  it("warns when a legacy key's path is not a system path", async () => {
    const { RqgActiveEffect, warn } = await loadSubject();

    const actor = makeCharacterActor();
    applyLegacyCustom(RqgActiveEffect, actor, "i.skill.dodge:baseChance", "5");

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("delegates a change that is not RQG's legacy syntax back to core", async () => {
    const { RqgActiveEffect, ActiveEffectStub, warn } = await loadSubject();

    const actor = makeCharacterActor();
    const change = routedChange("flags.someModule.someFlag", "custom", "1");
    const changes = {};
    RqgActiveEffect._applyChangeCustom(actor, change as any, 1, 2, changes as any);

    // a module's applyActiveEffect hook effect must keep working, and not be told to use an rqid
    expect(ActiveEffectStub._applyChangeCustom).toHaveBeenCalledWith(actor, change, 1, 2, changes);
    expect(actor.getBestEmbeddedDocumentByRqid).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });
});
