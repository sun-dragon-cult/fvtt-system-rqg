import { describe, expect, it } from "vitest";
import { getExternalRuneMagicItems, getExternalSpiritMagicItems } from "./spell-source";

function fakeActor(
  items: any[] = [],
  options: { alliedSpiritActorUuid?: string; uuid?: string; isOwner?: boolean } = {},
) {
  return {
    type: "character",
    uuid: options.uuid,
    isOwner: options.isOwner ?? true,
    items,
    system: { alliedSpiritActorUuid: options.alliedSpiritActorUuid },
  } as any;
}

/** A fake Cult item identified by rqid via the documentRqidFlags flag (see getCultRqid). */
function fakeCult(id: string, rqid: string) {
  return {
    id,
    type: "cult",
    system: { runePoints: { value: 0, max: 0 } },
    getFlag: (_scope: string, key: string) =>
      key === "documentRqidFlags" ? { id: rqid } : undefined,
  } as any;
}

function fakeSpiritMagicItem(id: string, sort: number) {
  return { id, type: "spiritMagic", sort } as any;
}

function fakeRuneMagicItem(id: string, sort: number, cultId: string) {
  return { id, type: "runeMagic", sort, system: { cultId } } as any;
}

/** A fake Allied Spirit bond partner actor - `instanceof Actor` per the global stub, so it
 *  passes getAlliedSpirit's type-guard checks. */
function fakeAlly(items: any[] = [], isOwner: boolean = true, name = "Whiskers") {
  const ally = Object.create((globalThis as any).Actor.prototype);
  return Object.assign(ally, {
    name,
    uuid: "Actor.ally1",
    isOwner,
    items,
    getBestEmbeddedDocumentByRqid: (rqid: string) =>
      items.find((i) => i.type === "cult" && i.getFlag("rqg", "documentRqidFlags")?.id === rqid),
  });
}

describe("getExternalSpiritMagicItems", () => {
  it("is empty when there's no bond partner", () => {
    expect(getExternalSpiritMagicItems(fakeActor())).toEqual([]);
  });

  it("returns the ally's Spirit Magic items sorted by sort order", () => {
    const spellB = fakeSpiritMagicItem("b", 2);
    const spellA = fakeSpiritMagicItem("a", 1);
    const otherItem = { id: "x", type: "skill", sort: 0 };
    const ally = fakeAlly([spellB, otherItem, spellA]);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const actor = fakeActor([], { alliedSpiritActorUuid: "Actor.ally1" });

    expect(getExternalSpiritMagicItems(actor)).toEqual([spellA, spellB]);
  });
});

describe("getExternalRuneMagicItems", () => {
  it("is empty when there's no bond partner", () => {
    const cult = fakeCult("cult1", "je.orlanth");
    expect(getExternalRuneMagicItems(fakeActor(), cult)).toEqual([]);
  });

  it("is empty when the bond partner isn't initiated to a matching cult", () => {
    const allyCult = fakeCult("cult2", "je.ernalda");
    const ally = fakeAlly([allyCult]);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const actor = fakeActor([], { alliedSpiritActorUuid: "Actor.ally1" });
    const cult = fakeCult("cult1", "je.orlanth");

    expect(getExternalRuneMagicItems(actor, cult)).toEqual([]);
  });

  it("returns the ally's Rune Magic items for the matching cult, sorted", () => {
    const allyCult = fakeCult("cult2", "je.orlanth");
    const spellB = fakeRuneMagicItem("b", 2, "cult2");
    const spellA = fakeRuneMagicItem("a", 1, "cult2");
    const otherCultSpell = fakeRuneMagicItem("c", 0, "some-other-cult");
    const ally = fakeAlly([allyCult, spellB, otherCultSpell, spellA]);
    (globalThis as any).fromUuidSync.mockReturnValue(ally);
    const actor = fakeActor([], { alliedSpiritActorUuid: "Actor.ally1" });
    const cult = fakeCult("cult1", "je.orlanth");

    expect(getExternalRuneMagicItems(actor, cult)).toEqual([spellA, spellB]);
  });
});
