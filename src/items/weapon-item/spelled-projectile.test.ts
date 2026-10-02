import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initSpelledProjectiles,
  projectileLabel,
  spendProjectileSpells,
  splitOffProjectile,
} from "./spelled-projectile";

function makeActor(items: any[]): any {
  const actor: any = {
    items: { get: (id: string) => items.find((item) => item.id === id), contents: items },
    createEmbeddedDocuments: vi.fn(async (_type: string, data: any[]) =>
      data.map((d) => makeItem({ ...d, id: "split", actor })),
    ),
    deleteEmbeddedDocuments: vi.fn(async () => []),
    updateEmbeddedDocuments: vi.fn(async () => []),
  };
  for (const item of items) {
    item.parent = actor;
  }
  return actor;
}

function makeItem({
  id,
  name = "Arrows",
  system = {},
  effects = [],
  flags = {},
  actor,
}: {
  id: string;
  name?: string;
  system?: Record<string, unknown>;
  effects?: any[];
  flags?: Record<string, any>;
  actor?: any;
}): any {
  const item: any = {
    id,
    type: "weapon",
    name,
    parent: actor,
    flags,
    system: { isProjectile: true, quantity: 1, projectileId: "", ...system },
    effects: { contents: effects },
    toObject: () => ({
      _id: id,
      name,
      flags: structuredClone(flags),
      system: { ...item.system },
      effects: effects.map((effect) => ({ ...effect })),
    }),
    getFlag: (scope: string, key: string) => flags[scope]?.[key],
    update: vi.fn(async (data: any) => {
      Object.assign(item.system, data.system);
    }),
    deleteEmbeddedDocuments: vi.fn(async () => []),
  };
  return item;
}

describe("splitOffProjectile", () => {
  it("splits one missile off a stack, without the stack's spells, and remembers the stack", async () => {
    const stack = makeItem({
      id: "stack",
      system: { quantity: 20 },
      effects: [{ id: "e1", name: "Bladesharp 1", system: { spell: {} } }, { id: "e2" }],
    });
    const actor = makeActor([stack]);

    const split = await splitOffProjectile(stack);

    expect(stack.system.quantity).toBe(19);
    const created = actor.createEmbeddedDocuments.mock.calls[0][1][0];
    expect(created._id).toBeUndefined();
    expect(created.system.quantity).toBe(1);
    expect(created.effects).toEqual([{ id: "e2" }]);
    expect(created.flags.rqg.splitFromProjectileId).toBe("stack");
    expect(split.id).toBe("split");
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("loads the split missile in the launchers that had the stack loaded", async () => {
    const stack = makeItem({ id: "stack", system: { quantity: 20 } });
    const bow = makeItem({ id: "bow", system: { isProjectile: false, projectileId: "stack" } });
    const sling = makeItem({
      id: "sling",
      system: { isProjectile: false, projectileId: "stones" },
    });
    const actor = makeActor([stack, bow, sling]);

    await splitOffProjectile(stack);

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "bow", system: { projectileId: "split" } },
    ]);
  });

  it.each([
    ["a single missile", { quantity: 1 }],
    ["a weapon that is not a projectile", { quantity: 3, isProjectile: false }],
    ["a thrown weapon", { quantity: 3, isThrownWeapon: true }],
  ])("leaves %s whole", async (_label, system) => {
    const item = makeItem({ id: "item", system });
    const actor = makeActor([item]);

    expect(await splitOffProjectile(item)).toBe(item);
    expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled();
  });
});

describe("spendProjectileSpells", () => {
  it("removes the spells, returns an unfired split missile to its stack and reloads from the stack", async () => {
    const stack = makeItem({ id: "stack", system: { quantity: 19 } });
    const split = makeItem({
      id: "split",
      system: { quantity: 1 },
      effects: [{ id: "speedart", system: { spell: {} } }, { id: "other" }],
      flags: { rqg: { splitFromProjectileId: "stack" } },
    });
    const bow = makeItem({ id: "bow", system: { isProjectile: false, projectileId: "split" } });
    const actor = makeActor([stack, split, bow]);

    await spendProjectileSpells(split);

    expect(split.deleteEmbeddedDocuments).toHaveBeenCalledWith("ActiveEffect", ["speedart"]);
    expect(stack.system.quantity).toBe(20);
    expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith("Item", ["split"]);
    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "bow", system: { projectileId: "stack" } },
    ]);
  });

  it("removes a used-up split missile without adding to the stack", async () => {
    const stack = makeItem({ id: "stack", system: { quantity: 19 } });
    const split = makeItem({
      id: "split",
      system: { quantity: 0 },
      flags: { rqg: { splitFromProjectileId: "stack" } },
    });
    const bow = makeItem({ id: "bow", system: { isProjectile: false, projectileId: "split" } });
    const actor = makeActor([stack, split, bow]);

    await spendProjectileSpells(split);

    expect(stack.update).not.toHaveBeenCalled();
    expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith("Item", ["split"]);
    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "bow", system: { projectileId: "stack" } },
    ]);
  });

  it("only removes the spells from a missile that was not split off a stack", async () => {
    const arrow = makeItem({
      id: "arrow",
      effects: [{ id: "speedart", system: { spell: {} } }],
    });
    const bow = makeItem({ id: "bow", system: { isProjectile: false, projectileId: "arrow" } });
    const actor = makeActor([arrow, bow]);

    await spendProjectileSpells(arrow);

    expect(arrow.deleteEmbeddedDocuments).toHaveBeenCalledWith("ActiveEffect", ["speedart"]);
    expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });
});

describe("initSpelledProjectiles", () => {
  class MockItem {}
  let onUpdateEffect: (effect: any, changed: any, options: object, userId: string) => void;

  beforeEach(() => {
    vi.stubGlobal("Item", MockItem);
    vi.stubGlobal("Hooks", { on: vi.fn((_hook: string, fn: any) => (onUpdateEffect = fn)) });
    vi.stubGlobal("game", { user: { id: "gm" } });
    initSpelledProjectiles();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function splitArrow(effects: any[]): { arrow: any; stack: any; actor: any } {
    const stack = makeItem({ id: "stack", system: { quantity: 19 } });
    const arrow = Object.assign(
      Object.create(MockItem.prototype),
      makeItem({ id: "split", effects, flags: { rqg: { splitFromProjectileId: "stack" } } }),
    );
    const actor = makeActor([stack, arrow]);
    return { arrow, stack, actor };
  }

  it("returns a split missile to its stack when its last spell expires", async () => {
    const speedart: any = { id: "speedart", active: false, system: { spell: {} } };
    const { arrow, stack, actor } = splitArrow([speedart]);
    speedart.parent = arrow;

    onUpdateEffect(speedart, { duration: { expired: true } }, {}, "gm");
    await vi.waitFor(() => expect(actor.deleteEmbeddedDocuments).toHaveBeenCalled());

    expect(arrow.deleteEmbeddedDocuments).toHaveBeenCalledWith("ActiveEffect", ["speedart"]);
    expect(stack.system.quantity).toBe(20);
    expect(actor.deleteEmbeddedDocuments).toHaveBeenCalledWith("Item", ["split"]);
  });

  it.each([
    [
      "another spell on it is still active",
      [{ id: "bladesharp", active: true, system: { spell: {} } }],
      "gm",
    ],
    ["another client made the update", [], "player"],
  ])("leaves the missile alone when %s", async (_label, others, userId) => {
    const speedart: any = { id: "speedart", active: false, system: { spell: {} } };
    const { arrow, actor } = splitArrow([speedart, ...others]);
    speedart.parent = arrow;

    onUpdateEffect(speedart, { duration: { expired: true } }, {}, userId);
    await Promise.resolve();

    expect(arrow.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });
});

describe("projectileLabel", () => {
  it("names the active spells on a projectile, leaving out disabled and expired ones", () => {
    const arrow = makeItem({
      id: "arrow",
      name: "Arrow",
      effects: [
        { name: "Speedart", active: true, system: { spell: {} } },
        { name: "Bladesharp 2", active: false, system: { spell: {} } },
        { name: "Not a spell", active: true, system: {} },
      ],
    });

    expect(projectileLabel(arrow)).toBe("Arrow (1) – Speedart");
  });
});
