import { describe, expect, it, vi } from "vitest";
import {
  AUTO_MAGIC_POINT_SOURCE,
  feedStorageFromSelf,
  getAvailableMagicPoints,
  getMagicPointDrawOrder,
  getMagicPointSourceOptions,
  getMaxTransferableToStorage,
  getStorageItems,
  moveSourceBefore,
  SELF_MAGIC_POINT_SOURCE,
  setMagicPointDrawOrder,
  spendMagicPoints,
} from "./magic-point-source";

function fakeActor(
  selfMp: number,
  storageItems: any[] = [],
  flags: { magicPointStorageOrder?: string[] } = {},
) {
  const storedFlags = { ...flags };
  return {
    items: storageItems,
    system: { attributes: { magicPoints: { value: selfMp } } },
    update: vi.fn(),
    updateEmbeddedDocuments: vi.fn(),
    getFlag: vi.fn((_scope: string, key: string) => (storedFlags as any)[key]),
    setFlag: vi.fn((_scope: string, key: string, value: unknown) => {
      (storedFlags as any)[key] = value;
      return Promise.resolve();
    }),
  } as any;
}

function crystal(
  id: string,
  name: string,
  value: number,
  max: number,
  equippedStatus: string = "equipped",
  identified: boolean = true,
) {
  return {
    id,
    name,
    type: "gear",
    system: { storedMagicPoints: { value, max, identified }, equippedStatus },
    update: vi.fn(),
  };
}

describe("getAvailableMagicPoints", () => {
  it("defaults to the actor's own pool", () => {
    const actor = fakeActor(6, [crystal("c1", "Crystal", 3, 5)]);
    expect(getAvailableMagicPoints(actor)).toBe(6);
    expect(getAvailableMagicPoints(actor, SELF_MAGIC_POINT_SOURCE)).toBe(6);
  });

  it("sums all storage items plus self for auto", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5), crystal("c2", "B", 2, 2)]);
    expect(getAvailableMagicPoints(actor, AUTO_MAGIC_POINT_SOURCE)).toBe(11);
  });

  it("returns only the picked item's value for an explicit source", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5), crystal("c2", "B", 2, 2)]);
    expect(getAvailableMagicPoints(actor, "c2")).toBe(2);
  });

  it("returns 0 for an unknown source id", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5)]);
    expect(getAvailableMagicPoints(actor, "does-not-exist")).toBe(0);
  });

  it("ignores items that aren't configured as a magic point store", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 0, 0)]);
    expect(getAvailableMagicPoints(actor, AUTO_MAGIC_POINT_SOURCE)).toBe(6);
  });
});

describe("getMagicPointSourceOptions", () => {
  it("is empty when the actor has no storage items", () => {
    const actor = fakeActor(6, []);
    expect(getMagicPointSourceOptions(actor)).toEqual([]);
  });

  it("lists auto, self, then each storage item when any exist", () => {
    const actor = fakeActor(6, [crystal("c1", "Crystal A", 3, 5)]);
    expect(getMagicPointSourceOptions(actor)).toEqual([
      { value: "auto", label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
      { value: "self", label: "RQG.Dialog.Common.MagicPointSourceOptions.Self" },
      { value: "c1", label: "Crystal A" },
    ]);
  });
});

describe("getStorageItems ordering", () => {
  it("returns natural item order when no order flag is set", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1), crystal("c2", "B", 1, 1)]);
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c1", "c2"]);
  });

  it("sorts by the magicPointStorageOrder flag", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1), crystal("c2", "B", 1, 1)], {
      magicPointStorageOrder: ["c2", "c1"],
    });
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c2", "c1"]);
  });

  it("appends items missing from the order flag after the ordered ones", () => {
    const actor = fakeActor(
      6,
      [crystal("c1", "A", 1, 1), crystal("c2", "B", 1, 1), crystal("c3", "C", 1, 1)],
      { magicPointStorageOrder: ["c3"] },
    );
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c3", "c1", "c2"]);
  });

  it("ignores stale ids in the order flag for items that no longer qualify", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1)], {
      magicPointStorageOrder: ["deleted-item", "c1"],
    });
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c1"]);
  });

  it("excludes storage items that aren't equipped", () => {
    const actor = fakeActor(6, [
      crystal("c1", "Equipped", 1, 1, "equipped"),
      crystal("c2", "Carried", 1, 1, "carried"),
      crystal("c3", "NotCarried", 1, 1, "notCarried"),
    ]);
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c1"]);
  });

  it("excludes storage items that haven't been identified", () => {
    const actor = fakeActor(6, [
      crystal("c1", "Identified", 1, 1, "equipped", true),
      crystal("c2", "Unidentified", 1, 1, "equipped", false),
    ]);
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c1"]);
  });

  it("does not require attunement - only equipped and identified", () => {
    const actor = fakeActor(6, [crystal("c1", "Never attuned", 1, 1, "equipped", true)]);
    expect(getStorageItems(actor).map((i) => i.id)).toEqual(["c1"]);
  });
});

describe("getMagicPointDrawOrder", () => {
  it("defaults to storage items in natural order, then self", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1), crystal("c2", "B", 1, 1)]);
    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "item", item: actor.items[0] },
      { type: "item", item: actor.items[1] },
      { type: "self" },
    ]);
  });

  it("places self wherever it sits in the order flag", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1), crystal("c2", "B", 1, 1)], {
      magicPointStorageOrder: ["c2", "self", "c1"],
    });
    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "item", item: actor.items[1] },
      { type: "self" },
      { type: "item", item: actor.items[0] },
    ]);
  });

  it("appends self at the end when the order flag omits it", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1)], {
      magicPointStorageOrder: ["c1"],
    });
    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "item", item: actor.items[0] },
      { type: "self" },
    ]);
  });
});

describe("moveSourceBefore", () => {
  it("moves an id to just before another id", () => {
    expect(moveSourceBefore(["a", "b", "c"], "c", "b")).toEqual(["a", "c", "b"]);
  });

  it("is a no-op when moving an id before itself", () => {
    expect(moveSourceBefore(["a", "b", "c"], "b", "b")).toEqual(["a", "b", "c"]);
  });

  it("is a no-op when either id is missing", () => {
    expect(moveSourceBefore(["a", "b", "c"], "z", "b")).toEqual(["a", "b", "c"]);
    expect(moveSourceBefore(["a", "b", "c"], "a", "z")).toEqual(["a", "b", "c"]);
  });

  it("moves an id to the end when beforeId is null", () => {
    expect(moveSourceBefore(["a", "b", "c"], "a", null)).toEqual(["b", "c", "a"]);
  });

  it("is a no-op when moving an id to the end that is already last", () => {
    expect(moveSourceBefore(["a", "b", "c"], "c", null)).toEqual(["a", "b", "c"]);
  });
});

describe("setMagicPointDrawOrder", () => {
  it("persists a full order to the magicPointStorageOrder flag", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1)]);
    await setMagicPointDrawOrder(actor, ["self", "c1"]);
    expect(actor.setFlag).toHaveBeenCalledWith("rqg", "magicPointStorageOrder", ["self", "c1"]);
  });
});

describe("spendMagicPoints", () => {
  it("does nothing for a non-positive amount", async () => {
    const actor = fakeActor(6);
    await spendMagicPoints(actor, 0, SELF_MAGIC_POINT_SOURCE);
    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("draws from self only, ignoring any storage items", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5)]);
    await spendMagicPoints(actor, 4, SELF_MAGIC_POINT_SOURCE);
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 2 }),
    );
  });

  it("auto drains storage items in order before falling back to self", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 2, 5), crystal("c2", "B", 3, 3)]);
    await spendMagicPoints(actor, 7, AUTO_MAGIC_POINT_SOURCE);

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "c1", system: { storedMagicPoints: { value: 0 } } },
      { _id: "c2", system: { storedMagicPoints: { value: 0 } } },
    ]);
    // 2 from c1 + 3 from c2 = 5, remaining 2 comes from self (6 - 2 = 4)
    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 4 }),
    );
  });

  it("auto draws only from self when there is enough in the first storage item", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 5, 5), crystal("c2", "B", 3, 3)]);
    await spendMagicPoints(actor, 4, AUTO_MAGIC_POINT_SOURCE);

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "c1", system: { storedMagicPoints: { value: 1 } } },
    ]);
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("auto respects a custom order that draws from self before some storage items", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 2, 5), crystal("c2", "B", 3, 3)], {
      magicPointStorageOrder: ["c1", "self", "c2"],
    });
    await spendMagicPoints(actor, 7, AUTO_MAGIC_POINT_SOURCE);

    // 2 from c1, then self covers 5 of its 6, leaving nothing for c2.
    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "c1", system: { storedMagicPoints: { value: 0 } } },
    ]);
    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
  });

  it("an explicit single source never overflows to self", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 2, 5)]);
    await spendMagicPoints(actor, 4, "c1");

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "c1", system: { storedMagicPoints: { value: 0 } } },
    ]);
    expect(actor.update).not.toHaveBeenCalled();
  });
});

describe("getMaxTransferableToStorage", () => {
  it("is capped by self's available points, minus 1", () => {
    const actor = fakeActor(3, [crystal("c1", "A", 0, 5)]);
    expect(getMaxTransferableToStorage(actor, actor.items[0])).toBe(2);
  });

  it("is capped by the item's remaining capacity", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5)]);
    expect(getMaxTransferableToStorage(actor, actor.items[0])).toBe(2);
  });

  it("is 0 when the item is already full", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 5, 5)]);
    expect(getMaxTransferableToStorage(actor, actor.items[0])).toBe(0);
  });

  it("is 0 when self has no points", () => {
    const actor = fakeActor(0, [crystal("c1", "A", 0, 5)]);
    expect(getMaxTransferableToStorage(actor, actor.items[0])).toBe(0);
  });

  it("is 0 when self has only 1 point - never drains self to 0", () => {
    const actor = fakeActor(1, [crystal("c1", "A", 0, 5)]);
    expect(getMaxTransferableToStorage(actor, actor.items[0])).toBe(0);
  });
});

describe("feedStorageFromSelf", () => {
  it("moves as much as possible from self into the item", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5)]);
    const item = actor.items[0];
    await feedStorageFromSelf(actor, item);

    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 4 }),
    );
    expect(item.update).toHaveBeenCalledWith({ system: { storedMagicPoints: { value: 5 } } });
  });

  it("caps the transfer at self's available points, not the full remaining capacity", async () => {
    const actor = fakeActor(3, [crystal("c1", "A", 0, 10)]);
    const item = actor.items[0];
    await feedStorageFromSelf(actor, item);

    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
    expect(item.update).toHaveBeenCalledWith({ system: { storedMagicPoints: { value: 2 } } });
  });

  it("never drains self all the way to 0", async () => {
    const actor = fakeActor(2, [crystal("c1", "A", 0, 5)]);
    const item = actor.items[0];
    await feedStorageFromSelf(actor, item);

    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
    expect(item.update).toHaveBeenCalledWith({ system: { storedMagicPoints: { value: 1 } } });
  });

  it("does nothing when self only has 1 point", async () => {
    const actor = fakeActor(1, [crystal("c1", "A", 0, 5)]);
    await feedStorageFromSelf(actor, actor.items[0]);

    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.items[0].update).not.toHaveBeenCalled();
  });

  it("does nothing when the item is already full", async () => {
    const actor = fakeActor(6, [crystal("c1", "A", 5, 5)]);
    await feedStorageFromSelf(actor, actor.items[0]);

    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.items[0].update).not.toHaveBeenCalled();
  });

  it("does nothing when self has no points", async () => {
    const actor = fakeActor(0, [crystal("c1", "A", 0, 5)]);
    await feedStorageFromSelf(actor, actor.items[0]);

    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.items[0].update).not.toHaveBeenCalled();
  });
});
