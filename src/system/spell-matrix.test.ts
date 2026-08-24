import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { Rqid } from "./api/rqid-api";
import { getMatrixSpellRows, getNextSpiritMagicSort } from "./spell-matrix";

/** A fake canonical Spirit Magic item, as returned by Rqid.fromRqid. */
function fakeCanonicalSpell(rqid: string, name: string) {
  return {
    type: ItemTypeEnum.SpiritMagic,
    toObject: () => ({ name, type: ItemTypeEnum.SpiritMagic, system: { points: 1 } }),
  } as any;
}

/** A fake physical item carrying one or more Spell Matrix Enchantment entries (#959). */
function fakeMatrixItem(
  id: string,
  matrixSpells: { rqid: string; name: string; points?: number; sort?: number }[],
) {
  return {
    id,
    type: "gear",
    system: {
      equippedStatus: "equipped",
      matrixSpells: matrixSpells.map(({ rqid, name, points, sort }) => ({
        spellRqidLink: { rqid, name },
        points: points ?? 1,
        sort: sort ?? 0,
      })),
    },
  } as any;
}

function fakeActor(items: any[]) {
  return { items } as any;
}

describe("getMatrixSpellRows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flattens every matrix item's entries, carrying each entry's own sort and entryIndex", async () => {
    vi.spyOn(Rqid, "fromRqid").mockImplementation(async (rqid) => {
      const byRqid: Record<string, any> = {
        "spell.dullblade": fakeCanonicalSpell("spell.dullblade", "Dullblade"),
        "spell.bladesharp": fakeCanonicalSpell("spell.bladesharp", "Bladesharp"),
        "spell.heal": fakeCanonicalSpell("spell.heal", "Heal"),
      };
      return rqid ? byRqid[rqid] : undefined;
    });
    (globalThis as any).CONFIG.Item = {
      documentClass: class FakeItem {
        constructor(data: any) {
          Object.assign(this, data);
        }
      },
    };

    const matrixItem1 = fakeMatrixItem("m1", [
      { rqid: "spell.dullblade", name: "Dullblade", sort: 300000 },
      { rqid: "spell.bladesharp", name: "Bladesharp", sort: 100000 },
    ]);
    const matrixItem2 = fakeMatrixItem("m2", [{ rqid: "spell.heal", name: "Heal", sort: 200000 }]);

    const rows = await getMatrixSpellRows(fakeActor([matrixItem1, matrixItem2]));

    expect(rows).toEqual([
      expect.objectContaining({
        sourceItem: matrixItem1,
        entryIndex: 0,
        sort: 300000,
        item: expect.objectContaining({ name: "Dullblade" }),
      }),
      expect.objectContaining({
        sourceItem: matrixItem1,
        entryIndex: 1,
        sort: 100000,
        item: expect.objectContaining({ name: "Bladesharp" }),
      }),
      expect.objectContaining({
        sourceItem: matrixItem2,
        entryIndex: 0,
        sort: 200000,
        item: expect.objectContaining({ name: "Heal" }),
      }),
    ]);
  });

  it("omits an unequipped matrix item entirely", async () => {
    const matrixItem = fakeMatrixItem("m1", [{ rqid: "spell.heal", name: "Heal" }]);
    matrixItem.system.equippedStatus = "carried";

    expect(await getMatrixSpellRows(fakeActor([matrixItem]))).toEqual([]);
  });
});

describe("getNextSpiritMagicSort", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 0 when there's no actor to append after", async () => {
    expect(await getNextSpiritMagicSort(null)).toBe(0);
    expect(await getNextSpiritMagicSort(undefined)).toBe(0);
  });

  it("lands one density step past the highest sort among owned spells and matrix entries", async () => {
    (globalThis as any).CONST = { SORT_INTEGER_DENSITY: 100000 };
    vi.spyOn(Rqid, "fromRqid").mockResolvedValue(fakeCanonicalSpell("spell.heal", "Heal"));
    (globalThis as any).CONFIG.Item = {
      documentClass: class FakeItem {
        constructor(data: any) {
          Object.assign(this, data);
        }
      },
    };

    const ownedSpell = { id: "s1", type: ItemTypeEnum.SpiritMagic, sort: 150000 };
    const matrixItem = fakeMatrixItem("m1", [{ rqid: "spell.heal", name: "Heal", sort: 250000 }]);

    expect(await getNextSpiritMagicSort(fakeActor([ownedSpell, matrixItem]))).toBe(350000);
  });
});
