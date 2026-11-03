import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCastableSpells } from "./castable-spells";
import { getAlliedBondActor } from "./magic-point-source";
import { getExternalSpiritMagicItems } from "./spell-source";

vi.mock("./magic-point-source", () => ({
  getAlliedBondActor: vi.fn(() => undefined),
  getBoundSpiritItems: vi.fn(() => []),
}));
vi.mock("./spell-source", () => ({
  getExternalSpiritMagicItems: vi.fn(() => []),
  getBoundSpiritSpiritMagicItems: vi.fn(() => []),
  getExternalRuneMagicItems: vi.fn(() => []),
}));
vi.mock("./spell-matrix", () => ({
  getMatrixSpellSlots: vi.fn((actor: any) =>
    actor.items.contents
      .filter((i: any) => i.system.matrixSpells?.length)
      .flatMap((sourceItem: any) =>
        sourceItem.system.matrixSpells.map((entry: any, entryIndex: number) => ({
          sourceItem,
          entryIndex,
          sort: 0,
          name: entry.spellRqidLink.name,
        })),
      ),
  ),
}));

function item(id: string, type: string, name: string, system: any = {}, sort = 0): any {
  return {
    id,
    uuid: `Actor.a.Item.${id}`,
    type,
    name,
    img: `${id}.svg`,
    sort,
    system,
    getFlag: () => undefined,
  };
}

function mockActor(items: any[], system: any = {}): any {
  return {
    documentName: "Actor",
    type: "character",
    name: "Vasana",
    token: null,
    items: {
      contents: items,
      get: (id: string) => items.find((i) => i.id === id),
    },
    system: {
      characteristics: { strength: { value: 13 }, dexterity: { value: 10 } },
      ...system,
    },
    getBestEmbeddedDocumentByRqid: (rqid: string) => items.find((i) => i.rqid === rqid),
  };
}

describe("getCastableSpells", () => {
  beforeEach(() => {
    vi.mocked(getAlliedBondActor).mockReturnValue(undefined);
    vi.mocked(getExternalSpiritMagicItems).mockReturnValue([]);
  });

  it("lists own, allied and matrix spells with their source", () => {
    const cult = item("c1", "cult", "Orlanth", { runePoints: { value: 2, max: 3 } });
    const actor = mockActor([
      item("sm", "spiritMagic", "Bladesharp", { points: 2, isVariable: true }),
      item("rm", "runeMagic", "Lightning", { points: 1, isOneUse: false, cultId: "c1" }),
      item("g1", "gear", "Crystal", {
        matrixSpells: [{ spellRqidLink: { name: "Heal" }, points: 3 }],
      }),
      cult,
    ]);
    const ally = { name: "Hawk" } as any;
    vi.mocked(getAlliedBondActor).mockReturnValue(ally);
    vi.mocked(getExternalSpiritMagicItems).mockReturnValue([
      item("ext", "spiritMagic", "Mobility", { points: 1, isVariable: false }),
    ]);

    const result = getCastableSpells(actor);

    expect(result.map((s) => [s.name, s.source, s.sourceName])).toEqual([
      ["Bladesharp", "own", undefined],
      ["Mobility", "allied", "Hawk"],
      ["Heal", "matrix", "Crystal"],
      ["Lightning", "own", undefined],
    ]);
    expect(result[2]).toMatchObject({
      points: 3,
      uuid: undefined,
      matrix: { itemId: "g1", entryIndex: 0 },
    });
    expect(result[3]).toMatchObject({ type: "runeMagic", cultId: "c1", cultName: "Orlanth" });
  });
});
