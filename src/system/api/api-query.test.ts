import { beforeEach, describe, expect, it, vi } from "vitest";
import { abilities, attributes, spells, weaponUsages } from "./api-query";
import { getAlliedBondActor } from "../magic-point-source";
import { getExternalSpiritMagicItems } from "../spell-source";

vi.mock("../magic-point-source", () => ({
  getAlliedBondActor: vi.fn(() => undefined),
  getBoundSpiritItems: vi.fn(() => []),
}));
vi.mock("../spell-source", () => ({
  getExternalSpiritMagicItems: vi.fn(() => []),
  getBoundSpiritSpiritMagicItems: vi.fn(() => []),
  getExternalRuneMagicItems: vi.fn(() => []),
}));
vi.mock("../spell-matrix", () => ({
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

describe("abilities", () => {
  const actor = mockActor([
    item("s2", "skill", "Scan", { chance: 45, category: "perception", hasExperience: true }),
    item("p1", "passion", "Hate (Lunars)", { chance: 70 }),
    item("s1", "skill", "Dodge", { chance: 30, category: "agility" }),
    item("w1", "weapon", "Spear"),
  ]);

  it("lists skills, runes and passions sorted by name", () => {
    expect(abilities(actor).map((a) => a.name)).toEqual(["Dodge", "Hate (Lunars)", "Scan"]);
  });

  it("filters by type and only sets category for skills", () => {
    const result = abilities(actor, { types: ["passion"] });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: "Hate (Lunars)", chance: 70, category: undefined });
    expect(abilities(actor)[2]).toMatchObject({ category: "perception", hasExperience: true });
  });
});

describe("weaponUsages", () => {
  const usage = (rqid: string, extra: any = {}) => ({
    skillRqidLink: { rqid, name: "" },
    minStrength: 0,
    minDexterity: 0,
    strikeRank: 2,
    ...extra,
  });
  const noUsage = usage("");
  const spearSkill = { ...item("sk", "skill", "Spear", { chance: 50 }), rqid: "i.skill.spear" };
  const spear = item("w1", "weapon", "Spear", {
    equippedStatus: "equipped",
    effect: { add: { melee: { attack: 10 }, missile: { attack: 0 } } },
    usage: {
      oneHand: usage("i.skill.spear"),
      offHand: noUsage,
      twoHand: usage("i.skill.spear", { minStrength: 20 }),
      missile: noUsage,
    },
  });
  const carriedBow = item("w2", "weapon", "Bow", {
    equippedStatus: "carried",
    usage: {
      oneHand: noUsage,
      offHand: noUsage,
      twoHand: noUsage,
      missile: usage("i.skill.spear"),
    },
  });
  const actor = mockActor([spear, carriedBow, spearSkill]);

  it("lists equipped weapon usages that have a linked skill", () => {
    const result = weaponUsages(actor);
    expect(result.map((u) => u.usage)).toEqual(["oneHand", "twoHand"]);
    expect(result[0]).toMatchObject({
      name: "Spear",
      skillName: "Spear",
      chance: 60,
      strikeRank: 2,
      unusable: false,
    });
    expect(result[1]?.unusable).toBe(true);
  });

  it("includes unequipped weapons on request", () => {
    expect(weaponUsages(actor, { includeUnequipped: true }).map((u) => u.name)).toEqual([
      "Spear",
      "Spear",
      "Bow",
    ]);
  });
});

describe("spells", () => {
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

    const result = spells(actor);

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

describe("attributes", () => {
  it("collects resources and rune points per cult", () => {
    const actor = mockActor([item("c1", "cult", "Orlanth", { runePoints: { value: 2, max: 3 } })], {
      attributes: {
        hitPoints: { value: 12, max: 14 },
        magicPoints: { value: 9, max: 15 },
        heroPoints: 1,
        dexStrikeRank: 3,
        sizStrikeRank: 2,
        damageBonus: "1d4",
        health: "healthy",
      },
      background: { reputation: 15 },
    });

    expect(attributes(actor)).toEqual({
      hitPoints: { value: 12, max: 14 },
      magicPoints: { value: 9, max: 15 },
      runePoints: [{ cultId: "c1", cultName: "Orlanth", value: 2, max: 3 }],
      heroPoints: 1,
      reputation: 15,
      dexStrikeRank: 3,
      sizStrikeRank: 2,
      damageBonus: "1d4",
      health: "healthy",
    });
  });
});
