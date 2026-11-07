import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCastableSpells } from "./castable-spells";
import { getAlliedBondActor } from "./magic-point-source";
import { getBoundSpiritSpiritMagicItems, getExternalSpiritMagicItems } from "./spell-source";

vi.mock("./magic-point-source", () => ({
  getAlliedBondActor: vi.fn(() => undefined),
  getBoundSpiritItems: vi.fn(() => []),
  boundSpiritSourceId: (item: any, spirit: any) => `boundSpirit:${item.id}:${spirit.uuid}`,
}));
vi.mock("./spell-source", () => ({
  getExternalSpiritMagicItems: vi.fn(() => []),
  getBoundSpiritSpiritMagicItems: vi.fn(() => []),
  getExternalRuneMagicItems: vi.fn(() => []),
}));
vi.mock("./spell-matrix", () => ({
  // The real one resolves each entry from its rqid; here the entry carries the resolved spell
  getMatrixSpellRows: vi.fn(async (actor: any) =>
    actor.items.contents
      .filter((i: any) => i.system.matrixSpells?.length)
      .flatMap((sourceItem: any) =>
        sourceItem.system.matrixSpells.map((entry: any, entryIndex: number) => ({
          sourceItem,
          entryIndex,
          sort: 0,
          item: entry.resolved,
        })),
      ),
  ),
}));

function item(
  id: string,
  type: string,
  name: string,
  system: any = {},
  sort = 0,
  rqid?: string,
): any {
  return {
    id,
    uuid: `Actor.a.Item.${id}`,
    type,
    name,
    img: `${id}.svg`,
    sort,
    system,
    getFlag: (_scope: string, key: string) =>
      key === "documentRqidFlags" && rqid ? { id: rqid } : undefined,
  };
}

function mockActor(items: any[], system: any = {}): any {
  return {
    documentName: "Actor",
    type: "character",
    name: "Vasana",
    uuid: "Actor.a",
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
    vi.mocked(getBoundSpiritSpiritMagicItems).mockReturnValue([]);
  });

  it("lists own, allied and matrix spells with their source", async () => {
    const cult = item("c1", "cult", "Orlanth", { runePoints: { value: 2, max: 3 } });
    const actor = mockActor([
      item("sm", "spiritMagic", "Bladesharp", { points: 2, isVariable: true }),
      item("rm", "runeMagic", "Lightning", { points: 1, isOneUse: false, cultId: "c1" }),
      item("g1", "gear", "Crystal", {
        matrixSpells: [
          { resolved: item("heal", "spiritMagic", "Heal", { points: 3, isVariable: true }) },
        ],
      }),
      cult,
    ]);
    const ally = { name: "Hawk" } as any;
    vi.mocked(getAlliedBondActor).mockReturnValue(ally);
    vi.mocked(getExternalSpiritMagicItems).mockReturnValue([
      item("ext", "spiritMagic", "Mobility", { points: 1, isVariable: false }),
    ]);

    const result = await getCastableSpells(actor);

    expect(result.map((s) => [s.name, s.source, s.sourceName])).toEqual([
      ["Bladesharp", "own", undefined],
      ["Mobility", "allied", "Hawk"],
      ["Heal", "matrix", "Crystal"],
      ["Lightning", "own", undefined],
    ]);
    expect(result[2]).toMatchObject({
      points: 3,
      isVariable: true,
      img: "g1.svg",
      uuid: undefined,
      matrix: { itemId: "g1", entryIndex: 0 },
    });
    expect(result[3]).toMatchObject({ type: "runeMagic", cultId: "c1", cultName: "Orlanth" });
  });

  it("gives each spell the id of its source, its rqid and its caster", async () => {
    const actor = mockActor([
      item("sm", "spiritMagic", "Bladesharp", { points: 2 }, 0, "i.spirit-magic.bladesharp"),
      item("g1", "gear", "Crystal", {
        matrixSpells: [
          {
            resolved: item("heal", "spiritMagic", "Heal", { points: 3 }, 0, "i.spirit-magic.heal"),
          },
        ],
      }),
    ]);
    vi.mocked(getAlliedBondActor).mockReturnValue({ name: "Hawk", uuid: "Actor.hawk" } as any);
    vi.mocked(getExternalSpiritMagicItems).mockReturnValue([
      item("ext", "spiritMagic", "Mobility", { points: 1 }, 0, "i.spirit-magic.mobility"),
    ]);
    vi.mocked(getBoundSpiritSpiritMagicItems).mockReturnValue([
      {
        sourceActor: { name: "Wraith", uuid: "Actor.wraith" },
        sourceItem: { id: "amulet" },
        items: [item("bs", "spiritMagic", "Demoralize", { points: 2 })],
      } as any,
    ]);

    const spells = await getCastableSpells(actor);
    expect(spells.every((s) => s.casterUuid === "Actor.a")).toBe(true);
    expect(spells.map((s) => [s.name, s.sourceId, s.rqid])).toEqual([
      ["Bladesharp", "Actor.a", "i.spirit-magic.bladesharp"],
      ["Mobility", "Actor.hawk", "i.spirit-magic.mobility"],
      ["Demoralize", "boundSpirit:amulet:Actor.wraith", undefined],
      ["Heal", "Actor.a.Item.g1", "i.spirit-magic.heal"],
    ]);
  });
});
