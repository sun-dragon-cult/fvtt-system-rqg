import { describe, expect, it, vi } from "vitest";
import {
  ALLY_RUNE_POINT_SOURCE,
  getAlliedCultItem,
  getAvailableRunePoints,
  getRunePointSourceOptions,
  SELF_RUNE_POINT_SOURCE,
  spendRunePoints,
} from "./rune-point-source";

function fakeActor(
  options: {
    type?: string;
    alliedSpiritActorUuid?: string;
    uuid?: string;
    isOwner?: boolean;
  } = {},
) {
  return {
    type: options.type ?? "character",
    uuid: options.uuid,
    isOwner: options.isOwner ?? true,
    system: {
      alliedSpiritActorUuid: options.alliedSpiritActorUuid,
    },
    updateEmbeddedDocuments: vi.fn(),
  } as any;
}

/** A fake Cult item identified by rqid via the documentRqidFlags flag (see getCultRqid). */
function fakeCult(id: string, name: string, rqid: string, rpValue: number, rpMax: number) {
  return {
    id,
    name,
    type: "cult",
    system: { runePoints: { value: rpValue, max: rpMax } },
    getFlag: vi.fn((_scope: string, key: string) =>
      key === "documentRqidFlags" ? { id: rqid } : undefined,
    ),
  } as any;
}

/** A fake Allied Spirit bond partner actor - `instanceof Actor` per the global stub, so it
 *  passes getAlliedSpirit's type-guard checks. Implements getBestEmbeddedDocumentByRqid the
 *  same (simplified, no multi-match priority) way RqgActor does, since getAlliedCultItem uses it
 *  to find the ally's matching cult. */
function fakeAlly(cultItems: any[] = [], isOwner: boolean = true, name = "Whiskers") {
  const ally = Object.create((globalThis as any).Actor.prototype);
  return Object.assign(ally, {
    name,
    uuid: "Actor.ally1",
    isOwner,
    getBestEmbeddedDocumentByRqid: (rqid: string) =>
      cultItems.find((i) => i.getFlag("rqg", "documentRqidFlags")?.id === rqid),
    updateEmbeddedDocuments: vi.fn(),
  });
}

describe("getAlliedCultItem", () => {
  it("returns undefined when no bond partner is linked", () => {
    const actor = fakeActor();
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);
    expect(getAlliedCultItem(actor, cult)).toBeUndefined();
  });

  it("returns undefined when the bond partner has no Cult item at all", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly([]));
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);
    expect(getAlliedCultItem(actor, cult)).toBeUndefined();
  });

  it("returns undefined when the bond partner belongs to a different cult", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Ernalda", "je.ernalda", 2, 2);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly([allyCult]));
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);
    expect(getAlliedCultItem(actor, cult)).toBeUndefined();
  });

  it("returns the bond partner's matching Cult item when rqids match", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Orlanth", "je.orlanth", 2, 4);
    const ally = fakeAlly([allyCult]);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);

    expect(getAlliedCultItem(actor, cult)).toEqual({ actor: ally, cult: allyCult });
  });

  it("returns undefined when the caster's own cult item has no rqid to match on", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Orlanth", "je.orlanth", 2, 4);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly([allyCult]));
    const cult = fakeCult("cult1", "Homebrew Cult", undefined as unknown as string, 3, 3);

    expect(getAlliedCultItem(actor, cult)).toBeUndefined();
  });
});

describe("getRunePointSourceOptions", () => {
  it("is empty when there's no bond partner", () => {
    const actor = fakeActor();
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);
    expect(getRunePointSourceOptions(actor, cult)).toEqual([]);
  });

  it("lists self and the ally when the bond partner shares the same cult", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Orlanth", "je.orlanth", 2, 4);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly([allyCult], true, "Whiskers"));
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);

    expect(getRunePointSourceOptions(actor, cult)).toEqual([
      { value: "self", label: "RQG.Dialog.Common.RunePointSourceOptions.Self" },
      { value: "ally", label: "Whiskers" },
    ]);
  });

  it("is empty when the bond partner isn't initiated to this cult", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Ernalda", "je.ernalda", 2, 2);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly([allyCult]));
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);

    expect(getRunePointSourceOptions(actor, cult)).toEqual([]);
  });
});

describe("getAvailableRunePoints", () => {
  it("defaults to the cult's own Rune Points", () => {
    const actor = fakeActor();
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 5);
    expect(getAvailableRunePoints(actor, cult)).toBe(3);
    expect(getAvailableRunePoints(actor, cult, SELF_RUNE_POINT_SOURCE)).toBe(3);
  });

  it("returns the ally's Rune Points for that same cult when selected", () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Orlanth", "je.orlanth", 2, 4);
    (globalThis as any).fromUuidSync.mockReturnValue(fakeAlly([allyCult]));
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);

    expect(getAvailableRunePoints(actor, cult, ALLY_RUNE_POINT_SOURCE)).toBe(2);
  });

  it("returns 0 for the ally source when no matching ally cult exists", () => {
    const actor = fakeActor();
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);
    expect(getAvailableRunePoints(actor, cult, ALLY_RUNE_POINT_SOURCE)).toBe(0);
  });
});

describe("spendRunePoints", () => {
  it("deducts from the caster's own cult for the self source (default)", async () => {
    const actor = fakeActor();
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 5);

    await spendRunePoints(actor, cult, 2);

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "cult1", system: { runePoints: { value: 1, max: 5 } } },
    ]);
  });

  it("deducts from the ally's matching cult for the ally source", async () => {
    const actor = fakeActor({ alliedSpiritActorUuid: "Actor.ally1" });
    const allyCult = fakeCult("cult2", "Orlanth", "je.orlanth", 4, 4);
    const ally = fakeAlly([allyCult]);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 3);

    await spendRunePoints(actor, cult, 2, ALLY_RUNE_POINT_SOURCE);

    expect(ally.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "cult2", system: { runePoints: { value: 2, max: 4 } } },
    ]);
    expect(actor.updateEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("also reduces max for a one-use spell and notifies", async () => {
    const actor = fakeActor();
    const cult = fakeCult("cult1", "Orlanth", "je.orlanth", 3, 5);

    await spendRunePoints(actor, cult, 2, SELF_RUNE_POINT_SOURCE, true);

    expect(actor.updateEmbeddedDocuments).toHaveBeenCalledWith("Item", [
      { _id: "cult1", system: { runePoints: { value: 1, max: 3 } } },
    ]);
    expect(ui.notifications?.info).toHaveBeenCalled();
  });
});
