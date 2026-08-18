import { describe, expect, it, vi } from "vitest";
import {
  ALLY_MAGIC_POINT_SOURCE,
  AUTO_MAGIC_POINT_SOURCE,
  boundSpiritSourceId,
  confirmBoundSpiritDrain,
  feedStorageFromSelf,
  getAlliedBondActor,
  getAlliedSpirit,
  getAvailableMagicPoints,
  getBondedPriest,
  getBoundSpiritActorByUuid,
  getBoundSpiritActors,
  getBoundSpiritDrainWarnings,
  getMagicPointDrawOrder,
  getMagicPointSourceOptions,
  getMaxTransferableToStorage,
  getStorageItems,
  getTotalStoredMagicPoints,
  moveSourceBefore,
  SELF_MAGIC_POINT_SOURCE,
  setMagicPointDrawOrder,
  spendMagicPoints,
} from "./magic-point-source";

// #999: DialogV2 has no shared mock in test/setup/foundryMockFunctions.js - confirmBoundSpiritDrain
// is the only thing in this file that calls it, so it's added here rather than globally.
(globalThis as any).foundry.applications.api.DialogV2 = {
  confirm: vi.fn(async () => true),
  wait: vi.fn(async () => "keepBound"),
};

function fakeActor(
  selfMp: number,
  storageItems: any[] = [],
  flags: { magicPointStorageOrder?: string[] } = {},
  options: {
    type?: string;
    alliedSpiritActorUuid?: string;
    uuid?: string;
    isOwner?: boolean;
  } = {},
) {
  const storedFlags = { ...flags };
  return {
    type: options.type ?? "character",
    uuid: options.uuid,
    isOwner: options.isOwner ?? true,
    items: storageItems,
    system: {
      attributes: { magicPoints: { value: selfMp } },
      alliedSpiritActorUuid: options.alliedSpiritActorUuid,
    },
    update: vi.fn(),
    updateEmbeddedDocuments: vi.fn(),
    getFlag: vi.fn((_scope: string, key: string) => (storedFlags as any)[key]),
    setFlag: vi.fn((_scope: string, key: string, value: unknown) => {
      (storedFlags as any)[key] = value;
      return Promise.resolve();
    }),
  } as any;
}

/** A fake bond-partner actor (Allied Spirit #957 or bound spirit #999) - `instanceof Actor` per
 *  the global stub in test/setup/foundryMockFunctions.js, so it passes getAlliedSpirit's/
 *  getBoundSpiritActors' type-guard checks. */
function fakeBondActor(
  mpValue: number,
  mpMax: number,
  isOwner: boolean = true,
  name = "Whiskers",
  uuid = "Actor.ally1",
) {
  const actor = Object.create((globalThis as any).Actor.prototype);
  return Object.assign(actor, {
    name,
    uuid,
    isOwner,
    system: { attributes: { magicPoints: { value: mpValue, max: mpMax } } },
    update: vi.fn(),
  });
}

function fakeAlly(mpValue: number, mpMax: number, isOwner: boolean = true, name = "Whiskers") {
  return fakeBondActor(mpValue, mpMax, isOwner, name, "Actor.ally1");
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

/** A fake spirit trapped via a Binding Enchantment (#999) - see fakeBondActor. */
function fakeSpirit(
  mpValue: number,
  mpMax: number,
  isOwner: boolean = true,
  name = "Wisp",
  uuid = "Actor.spirit1",
) {
  return fakeBondActor(mpValue, mpMax, isOwner, name, uuid);
}

/** A fake item holding one or more spirits via a Binding Enchantment (#999) - e.g. a tiara set
 *  with several bound crystals. */
function boundSpiritItem(
  id: string,
  name: string,
  equippedStatus: string = "equipped",
  boundSpiritActorUuids: string[] = ["Actor.spirit1"],
) {
  return {
    id,
    name,
    type: "gear",
    system: {
      equippedStatus,
      boundSpiritActorUuids,
      storedMagicPoints: { value: 0, max: 0, identified: false },
    },
    update: vi.fn(),
  };
}

describe("getAlliedSpirit", () => {
  it("returns undefined when no ally is linked", () => {
    const actor = fakeActor(6);
    expect(getAlliedSpirit(actor)).toBeUndefined();
  });

  it("returns undefined when the actor isn't a Character (e.g. no field for it)", () => {
    const actor = fakeActor(6, [], {}, { type: "creature", alliedSpiritActorUuid: "Actor.x" });
    expect(getAlliedSpirit(actor)).toBeUndefined();
  });

  it("returns undefined when the linked uuid doesn't resolve to an Actor", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.missing" });
    (globalThis as any).fromUuidSync.mockReturnValue(null);
    expect(getAlliedSpirit(actor)).toBeUndefined();
  });

  it("returns undefined when the current user isn't Owner on the ally", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    const ally = fakeAlly(4, 6, false);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    expect(getAlliedSpirit(actor)).toBeUndefined();
  });

  it("returns the ally when linked, resolvable, and owned", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    const ally = fakeAlly(4, 6, true);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    expect(getAlliedSpirit(actor)).toBe(ally);
  });
});

describe("getBondedPriest", () => {
  it("returns undefined when no actor in the world links to this one", () => {
    const ally = fakeActor(4, [], {}, { uuid: "Actor.ally1" });
    (globalThis as any).game.actors.contents = [
      fakeActor(6, [], {}, { uuid: "Actor.other", alliedSpiritActorUuid: "Actor.someone-else" }),
    ];
    expect(getBondedPriest(ally)).toBeUndefined();
  });

  it("returns the actor whose alliedSpiritActorUuid points back at this one", () => {
    const ally = fakeActor(4, [], {}, { uuid: "Actor.ally1" });
    const priest = fakeActor(
      6,
      [],
      {},
      { uuid: "Actor.priest1", alliedSpiritActorUuid: "Actor.ally1" },
    );
    (globalThis as any).game.actors.contents = [priest];
    expect(getBondedPriest(ally)).toBe(priest);
  });

  it("ignores a linking actor that isn't a Character", () => {
    const ally = fakeActor(4, [], {}, { uuid: "Actor.ally1" });
    (globalThis as any).game.actors.contents = [
      fakeActor(
        6,
        [],
        {},
        {
          type: "creature",
          uuid: "Actor.priest1",
          alliedSpiritActorUuid: "Actor.ally1",
        },
      ),
    ];
    expect(getBondedPriest(ally)).toBeUndefined();
  });

  it("returns undefined when the current user doesn't own the linking priest", () => {
    const ally = fakeActor(4, [], {}, { uuid: "Actor.ally1" });
    (globalThis as any).game.actors.contents = [
      fakeActor(
        6,
        [],
        {},
        {
          uuid: "Actor.priest1",
          alliedSpiritActorUuid: "Actor.ally1",
          isOwner: false,
        },
      ),
    ];
    expect(getBondedPriest(ally)).toBeUndefined();
  });
});

describe("getAlliedBondActor", () => {
  it("returns the linked ally when this actor is the priest", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    const ally = fakeAlly(4, 6, true);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    expect(getAlliedBondActor(actor)).toBe(ally);
  });

  it("returns the bonded priest when this actor is the linked ally", () => {
    const ally = fakeActor(4, [], {}, { uuid: "Actor.ally1" });
    const priest = fakeActor(
      6,
      [],
      {},
      { uuid: "Actor.priest1", alliedSpiritActorUuid: "Actor.ally1" },
    );
    (globalThis as any).game.actors.contents = [priest];
    expect(getAlliedBondActor(ally)).toBe(priest);
  });

  it("returns undefined when neither direction resolves", () => {
    const actor = fakeActor(6, [], {}, { uuid: "Actor.lonely" });
    expect(getAlliedBondActor(actor)).toBeUndefined();
  });
});

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

  it("returns the linked ally's own Magic Points for the ally source", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly(4, 6));
    expect(getAvailableMagicPoints(actor, ALLY_MAGIC_POINT_SOURCE)).toBe(4);
  });

  it("returns 0 for the ally source when no ally is linked", () => {
    const actor = fakeActor(6);
    expect(getAvailableMagicPoints(actor, ALLY_MAGIC_POINT_SOURCE)).toBe(0);
  });

  it("includes a linked ally's Magic Points in the auto total", () => {
    const actor = fakeActor(
      6,
      [crystal("c1", "A", 3, 5)],
      {},
      { alliedSpiritActorUuid: "Actor.ally1" },
    );
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly(4, 6));
    expect(getAvailableMagicPoints(actor, AUTO_MAGIC_POINT_SOURCE)).toBe(13);
  });
});

describe("getTotalStoredMagicPoints", () => {
  it("sums value and max across all storage items, excluding self", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5), crystal("c2", "B", 2, 2)]);
    expect(getTotalStoredMagicPoints(actor)).toEqual({ value: 5, max: 7 });
  });

  it("accepts an already-computed storage items list instead of recomputing it", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5)]);
    const precomputed = getStorageItems(actor);
    expect(getTotalStoredMagicPoints(actor, precomputed)).toEqual({ value: 3, max: 5 });
  });

  it("includes a linked ally's Magic Points, not just storage items", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5)], {}, { alliedSpiritActorUuid: "x" });
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly(4, 6));
    expect(getTotalStoredMagicPoints(actor)).toEqual({ value: 7, max: 11 });
  });

  it("counts an ally-only actor (no storage items) instead of reading 0/0", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "x" });
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly(4, 6));
    expect(getTotalStoredMagicPoints(actor)).toEqual({ value: 4, max: 6 });
  });

  it("accepts an already-resolved ally instead of re-resolving the bond", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "x" });
    const ally = fakeAlly(4, 6);
    expect(getTotalStoredMagicPoints(actor, [], ally)).toEqual({ value: 4, max: 6 });
  });

  it("doesn't double-count a spirit that's both the Allied Spirit and listed as bound in an item (#999)", () => {
    const item = boundSpiritItem("i1", "Ring", "equipped", ["Actor.ally1"]);
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const actor = fakeActor(6, [item], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    expect(getTotalStoredMagicPoints(actor)).toEqual({ value: 4, max: 6 });
  });
});

describe("getMagicPointSourceOptions", () => {
  it("is empty when the actor has no storage items", () => {
    const actor = fakeActor(6, []);
    expect(getMagicPointSourceOptions(actor)).toEqual([]);
  });

  it("lists auto, then storage items and self in the actor's draw order", () => {
    const actor = fakeActor(6, [crystal("c1", "Crystal A", 3, 5)]);
    // Default draw order (no order flag set) is storage items first, self last - see
    // getMagicPointDrawOrder - and this picker should mirror that exactly.
    expect(getMagicPointSourceOptions(actor)).toEqual([
      { value: "auto", label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
      { value: "c1", label: "Crystal A" },
      { value: "self", label: "RQG.Dialog.Common.MagicPointSourceOptions.Self" },
    ]);
  });

  it("follows a custom magicPointStorageOrder flag, not a fixed self-first order", () => {
    const actor = fakeActor(
      6,
      [crystal("c1", "Crystal A", 3, 5), crystal("c2", "Crystal B", 1, 1)],
      {
        magicPointStorageOrder: ["c2", "self", "c1"],
      },
    );
    expect(getMagicPointSourceOptions(actor)).toEqual([
      { value: "auto", label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
      { value: "c2", label: "Crystal B" },
      { value: "self", label: "RQG.Dialog.Common.MagicPointSourceOptions.Self" },
      { value: "c1", label: "Crystal A" },
    ]);
  });

  it("is non-empty (auto/self/ally) when only an ally is linked, no storage items", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly(4, 6, true, "Whiskers"));
    expect(getMagicPointSourceOptions(actor)).toEqual([
      { value: "auto", label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
      { value: "self", label: "RQG.Dialog.Common.MagicPointSourceOptions.Self" },
      { value: "ally", label: "Whiskers" },
    ]);
  });

  it("omits the ally option when the current user doesn't own it", () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly(4, 6, false));
    expect(getMagicPointSourceOptions(actor)).toEqual([]);
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

  it("appends a linked ally last, below self, by default", () => {
    const actor = fakeActor(
      6,
      [crystal("c1", "A", 1, 1)],
      {},
      { alliedSpiritActorUuid: "Actor.ally1" },
    );
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "item", item: actor.items[0] },
      { type: "self" },
      { type: "ally", actor: ally },
    ]);
  });

  it("places the ally wherever it sits in the order flag", () => {
    const actor = fakeActor(
      6,
      [crystal("c1", "A", 1, 1)],
      { magicPointStorageOrder: ["ally", "c1", "self"] },
      { alliedSpiritActorUuid: "Actor.ally1" },
    );
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "ally", actor: ally },
      { type: "item", item: actor.items[0] },
      { type: "self" },
    ]);
  });

  it("appends the ally after self when the order flag predates the bond", () => {
    const actor = fakeActor(
      6,
      [crystal("c1", "A", 1, 1)],
      { magicPointStorageOrder: ["c1", "self"] },
      { alliedSpiritActorUuid: "Actor.ally1" },
    );
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "item", item: actor.items[0] },
      { type: "self" },
      { type: "ally", actor: ally },
    ]);
  });

  it("omits the ally entirely when none is linked", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1)]);
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

  it("draws from the linked ally, leaving the caster's own pool untouched", async () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    await spendMagicPoints(actor, 3, ALLY_MAGIC_POINT_SOURCE);

    expect(ally.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("an explicit ally draw never overflows to self", async () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    const ally = fakeAlly(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    await spendMagicPoints(actor, 5, ALLY_MAGIC_POINT_SOURCE);

    expect(ally.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 0 }),
    );
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("does nothing when the ally source is picked but no ally resolves", async () => {
    const actor = fakeActor(6);
    await spendMagicPoints(actor, 3, ALLY_MAGIC_POINT_SOURCE);

    expect(actor.update).not.toHaveBeenCalled();
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("auto drains storage and self before falling back to a linked ally", async () => {
    const actor = fakeActor(
      3,
      [crystal("c1", "A", 2, 5)],
      {},
      { alliedSpiritActorUuid: "Actor.ally1" },
    );
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    // 2 from c1, 3 from self, remaining 2 from the ally (below self by default).
    await spendMagicPoints(actor, 7, AUTO_MAGIC_POINT_SOURCE);

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "c1", system: { storedMagicPoints: { value: 0 } } },
    ]);
    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 0 }),
    );
    expect(ally.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 2 }),
    );
  });

  it("auto never touches a linked ally when self and storage cover the amount", async () => {
    const actor = fakeActor(6, [], {}, { alliedSpiritActorUuid: "Actor.ally1" });
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);

    await spendMagicPoints(actor, 3, AUTO_MAGIC_POINT_SOURCE);

    expect(ally.update).not.toHaveBeenCalled();
    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 3 }),
    );
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

describe("getBoundSpiritActors", () => {
  it("is empty when the item has no bound spirits", () => {
    const item = boundSpiritItem("i1", "Ring", "equipped", []);
    expect(getBoundSpiritActors(item as any)).toEqual([]);
  });

  it("omits a uuid that doesn't resolve to an Actor", () => {
    const item = boundSpiritItem("i1", "Ring");
    (globalThis as any).fromUuidSync.mockReturnValue(null);
    expect(getBoundSpiritActors(item as any)).toEqual([]);
  });

  it("omits a spirit the current user isn't Owner on", () => {
    const item = boundSpiritItem("i1", "Ring");
    (globalThis as any).fromUuidSync.mockReturnValue(fakeSpirit(2, 4, false));
    expect(getBoundSpiritActors(item as any)).toEqual([]);
  });

  it("returns the spirit when linked, resolvable, and owned", () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 4, true);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    expect(getBoundSpiritActors(item as any)).toEqual([spirit]);
  });

  it("returns every resolvable spirit, in array order, for an item bound with several (e.g. a tiara set with several bound crystals)", () => {
    const item = boundSpiritItem("i1", "Tiara", "equipped", [
      "Actor.spirit1",
      "Actor.spirit2",
      "Actor.spirit3",
    ]);
    const spirit1 = fakeSpirit(2, 4, true, "Wisp");
    const spirit2 = fakeSpirit(1, 2, true, "Ember");
    const spirit3 = fakeSpirit(3, 3, false, "Unowned"); // not Owner - excluded
    (globalThis as any).fromUuidSync.mockImplementation(
      (uuid: string) =>
        ({ "Actor.spirit1": spirit1, "Actor.spirit2": spirit2, "Actor.spirit3": spirit3 })[uuid],
    );

    expect(getBoundSpiritActors(item as any)).toEqual([spirit1, spirit2]);
  });
});

describe("getBoundSpiritActorByUuid", () => {
  it("resolves one specific spirit bound in the item, by uuid", () => {
    const item = boundSpiritItem("i1", "Tiara", "equipped", ["Actor.spirit1", "Actor.spirit2"]);
    const spirit2 = fakeSpirit(1, 2, true, "Ember", "Actor.spirit2");
    (globalThis as any).fromUuidSync.mockImplementation((uuid: string) =>
      uuid === "Actor.spirit2" ? spirit2 : fakeSpirit(2, 4, true, "Wisp"),
    );

    expect(getBoundSpiritActorByUuid(item as any, "Actor.spirit2")).toBe(spirit2);
  });

  it("returns undefined for a uuid that isn't actually bound in this item", () => {
    const item = boundSpiritItem("i1", "Ring", "equipped", ["Actor.spirit1"]);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeSpirit(2, 4));

    expect(getBoundSpiritActorByUuid(item as any, "Actor.someone-else")).toBeUndefined();
  });
});

describe("getMagicPointDrawOrder — bound spirits (#999)", () => {
  it("defaults to storage items, then bound spirits, then self", () => {
    const actor = fakeActor(6, [crystal("c1", "A", 1, 1), boundSpiritItem("i1", "Ring")]);
    const spirit = fakeSpirit(2, 4);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "item", item: actor.items[0] },
      { type: "boundSpirit", item: actor.items[1], spiritActor: spirit },
      { type: "self" },
    ]);
  });

  it("excludes a bound-spirit item that isn't equipped", () => {
    const actor = fakeActor(6, [boundSpiritItem("i1", "Ring", "carried")]);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeSpirit(2, 4));
    expect(getMagicPointDrawOrder(actor)).toEqual([{ type: "self" }]);
  });

  it("places a bound spirit wherever it sits in the order flag, keyed by boundSpiritSourceId", () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 4);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item], {
      magicPointStorageOrder: [boundSpiritSourceId(item as any, spirit), "self"],
    });

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "boundSpirit", item: actor.items[0], spiritActor: spirit },
      { type: "self" },
    ]);
  });

  it("yields one draw-order entry per spirit for an item bound with several (e.g. a tiara set with several bound crystals)", () => {
    const item = boundSpiritItem("i1", "Tiara", "equipped", ["Actor.spirit1", "Actor.spirit2"]);
    const spirit1 = fakeSpirit(2, 4, true, "Wisp", "Actor.spirit1");
    const spirit2 = fakeSpirit(1, 2, true, "Ember", "Actor.spirit2");
    (globalThis as any).fromUuidSync.mockImplementation(
      (uuid: string) => ({ "Actor.spirit1": spirit1, "Actor.spirit2": spirit2 })[uuid],
    );
    const actor = fakeActor(6, [item]);

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "boundSpirit", item: actor.items[0], spiritActor: spirit1 },
      { type: "boundSpirit", item: actor.items[0], spiritActor: spirit2 },
      { type: "self" },
    ]);
  });

  it("excludes a spirit that's also the actor's Allied Spirit bond partner, even if it's also listed as bound in an item (avoids double-counted totals and a spendMagicPoints write race)", () => {
    const item = boundSpiritItem("i1", "Ring", "equipped", ["Actor.ally1"]);
    const ally = fakeAlly(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const actor = fakeActor(6, [item], {}, { alliedSpiritActorUuid: "Actor.ally1" });

    expect(getMagicPointDrawOrder(actor)).toEqual([
      { type: "self" },
      { type: "ally", actor: ally },
    ]);
  });
});

describe("getMagicPointSourceOptions — bound spirits (#999)", () => {
  it("lists a bound spirit by its own name, keyed by boundSpiritSourceId", () => {
    const item = boundSpiritItem("i1", "Ring");
    const actor = fakeActor(6, [item]);
    const spirit = fakeSpirit(2, 4, true, "Wisp");
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);

    expect(getMagicPointSourceOptions(actor)).toEqual([
      { value: "auto", label: "RQG.Dialog.Common.MagicPointSourceOptions.Auto" },
      { value: boundSpiritSourceId(item as any, spirit), label: "Wisp" },
      { value: "self", label: "RQG.Dialog.Common.MagicPointSourceOptions.Self" },
    ]);
  });
});

describe("getAvailableMagicPoints — bound spirits (#999)", () => {
  it("returns the bound spirit's own Magic Points for its source id", () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 4);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    expect(getAvailableMagicPoints(actor, boundSpiritSourceId(item as any, spirit))).toBe(2);
  });

  it("includes a bound spirit's Magic Points in the auto total", () => {
    const item = boundSpiritItem("i1", "Ring");
    const actor = fakeActor(6, [crystal("c1", "A", 3, 5), item]);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeSpirit(2, 4));

    expect(getAvailableMagicPoints(actor, AUTO_MAGIC_POINT_SOURCE)).toBe(11);
  });
});

describe("spendMagicPoints — bound spirits (#999)", () => {
  it("draws from the bound spirit, leaving the caster's own pool untouched", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 3, boundSpiritSourceId(item as any, spirit));

    expect(spirit.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
    expect(actor.update).not.toHaveBeenCalled();
    expect(item.update).not.toHaveBeenCalled();
  });

  it("releases the spirit (removes its uuid from boundSpiritActorUuids) when drained to 0, and notifies", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(3, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 3, boundSpiritSourceId(item as any, spirit));

    expect(spirit.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 0 }),
    );
    expect(item.update).toHaveBeenCalledWith({ system: { boundSpiritActorUuids: [] } });
    expect((globalThis as any).ui.notifications.info).toHaveBeenCalled();
  });

  it("releasing one bound spirit leaves any others bound in the same item untouched", async () => {
    const item = boundSpiritItem("i1", "Tiara", "equipped", ["Actor.spirit1", "Actor.spirit2"]);
    const spirit1 = fakeSpirit(2, 6, true, "Wisp", "Actor.spirit1");
    const spirit2 = fakeSpirit(4, 6, true, "Ember", "Actor.spirit2");
    (globalThis as any).fromUuidSync.mockImplementation(
      (uuid: string) => ({ "Actor.spirit1": spirit1, "Actor.spirit2": spirit2 })[uuid],
    );
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 2, boundSpiritSourceId(item as any, spirit1));

    expect(item.update).toHaveBeenCalledWith({
      system: { boundSpiritActorUuids: ["Actor.spirit2"] },
    });
    expect(spirit2.update).not.toHaveBeenCalled();
  });

  it("does not release the spirit when it still has points left", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 3, boundSpiritSourceId(item as any, spirit));

    expect(item.update).not.toHaveBeenCalled();
  });

  it("an explicit bound-spirit draw never overflows to self", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 5, boundSpiritSourceId(item as any, spirit));

    expect(spirit.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 0 }),
    );
    expect(actor.update).not.toHaveBeenCalled();
  });
});

describe("spendMagicPoints — avoidRelease (#999)", () => {
  it("in auto mode, leaves 1 MP in the bound spirit and draws the rest from the next source", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 3, AUTO_MAGIC_POINT_SOURCE, true);

    // Only 1 of the spirit's 2 MP is drawn (leaving 1, not draining to 0); the other 2 needed
    // come from self, which is next in the default draw order.
    expect(spirit.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
    expect(item.update).not.toHaveBeenCalled();
    expect(actor.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 4 }),
    );
  });

  it("for an explicit single bound-spirit source with nothing else to draw from, accepts a shortfall rather than releasing", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 5, boundSpiritSourceId(item as any, spirit), true);

    expect(spirit.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 1 }),
    );
    expect(item.update).not.toHaveBeenCalled();
    expect(actor.update).not.toHaveBeenCalled();
  });

  it("does nothing extra when the spirit has more than 1 point to spare", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    await spendMagicPoints(actor, 2, boundSpiritSourceId(item as any, spirit), true);

    expect(spirit.update).toHaveBeenCalledWith(
      foundry.utils.expandObject({ "system.attributes.magicPoints.value": 2 }),
    );
    expect(item.update).not.toHaveBeenCalled();
  });
});

describe("getBoundSpiritDrainWarnings (#999)", () => {
  it("is empty when the draw wouldn't drain the bound spirit to 0", () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    expect(getBoundSpiritDrainWarnings(actor, 2, boundSpiritSourceId(item as any, spirit))).toEqual(
      [],
    );
  });

  it("flags a bound spirit that a draw would zero out", () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    expect(getBoundSpiritDrainWarnings(actor, 2, boundSpiritSourceId(item as any, spirit))).toEqual(
      [{ item, spiritActor: spirit, amount: 2 }],
    );
  });

  it("is empty for a non-positive amount", () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(0, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);

    expect(getBoundSpiritDrainWarnings(actor, 0, boundSpiritSourceId(item as any, spirit))).toEqual(
      [],
    );
  });
});

describe("confirmBoundSpiritDrain (#999)", () => {
  it("proceeds without prompting when no bound spirit would be drained to 0", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(4, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);
    (globalThis as any).foundry.applications.api.DialogV2.wait.mockClear();

    const decision = await confirmBoundSpiritDrain(
      actor,
      2,
      boundSpiritSourceId(item as any, spirit),
    );

    expect(decision).toEqual({ proceed: true, avoidRelease: false });
    expect((globalThis as any).foundry.applications.api.DialogV2.wait).not.toHaveBeenCalled();
  });

  it("prompts and returns {proceed:true, avoidRelease:true} when the player chooses to keep the spirit bound", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);
    (globalThis as any).foundry.applications.api.DialogV2.wait.mockResolvedValueOnce("keepBound");

    const decision = await confirmBoundSpiritDrain(
      actor,
      2,
      boundSpiritSourceId(item as any, spirit),
    );

    expect(decision).toEqual({ proceed: true, avoidRelease: true });
    expect((globalThis as any).foundry.applications.api.DialogV2.wait).toHaveBeenCalled();
  });

  it("returns {proceed:true, avoidRelease:false} when the player chooses to release the spirit", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);
    (globalThis as any).foundry.applications.api.DialogV2.wait.mockResolvedValueOnce("release");

    const decision = await confirmBoundSpiritDrain(
      actor,
      2,
      boundSpiritSourceId(item as any, spirit),
    );

    expect(decision).toEqual({ proceed: true, avoidRelease: false });
  });

  it("returns {proceed:false} when the player cancels (or closes the dialog)", async () => {
    const item = boundSpiritItem("i1", "Ring");
    const spirit = fakeSpirit(2, 6);
    (globalThis as any).fromUuidSync.mockReturnValue(spirit);
    const actor = fakeActor(6, [item]);
    (globalThis as any).foundry.applications.api.DialogV2.wait.mockResolvedValueOnce(null);

    const decision = await confirmBoundSpiritDrain(
      actor,
      2,
      boundSpiritSourceId(item as any, spirit),
    );

    expect(decision).toEqual({ proceed: false, avoidRelease: false });
  });
});
