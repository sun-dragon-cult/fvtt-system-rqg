import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nearestFreeCell, summonedTokenCells, tokenCell } from "./token-cells";
import { summonedFolder } from "./summon";

describe("nearestFreeCell", () => {
  const caster = { col: 5, row: 5, w: 1, h: 1 };

  it("places a token right next to the caster", () => {
    const cell = nearestFreeCell(caster, { w: 1, h: 1 }, [caster])!;
    expect(Math.max(Math.abs(cell.col - 5), Math.abs(cell.row - 5))).toBe(1);
  });

  it("skips cells other tokens are in", () => {
    const neighbours = [
      [4, 5],
      [6, 5],
      [5, 4],
      [5, 6],
    ].map(([col, row]) => ({ col: col!, row: row!, w: 1, h: 1 }));
    const cell = nearestFreeCell(caster, { w: 1, h: 1 }, [caster, ...neighbours])!;
    expect(Math.abs(cell.col - 5)).toBe(1);
    expect(Math.abs(cell.row - 5)).toBe(1);
  });

  it("keeps a large token clear of the caster", () => {
    const size = { w: 2, h: 2 };
    const cell = nearestFreeCell(caster, size, [caster])!;
    const overlapsCaster =
      cell.col < 6 && 5 < cell.col + size.w && cell.row < 6 && 5 < cell.row + size.h;
    expect(overlapsCaster).toBe(false);
  });

  it("gives up when nothing within reach is free", () => {
    const wall = { col: -100, row: -100, w: 300, h: 300 };
    expect(nearestFreeCell(caster, { w: 1, h: 1 }, [wall], 2)).toBeUndefined();
  });
});

describe("token cells", () => {
  // A 100 px square grid that starts 50 px in from the scene's corner
  const grid = {
    size: 100,
    sizeX: 100,
    sizeY: 100,
    getOffset: ({ x, y }: { x: number; y: number }) => ({
      i: Math.floor((y - 50) / 100),
      j: Math.floor((x - 50) / 100),
    }),
  } as any;

  it("finds the cell a token covers from its center", () => {
    expect(tokenCell(grid, { x: 250, y: 150, width: 1, height: 1 })).toEqual({
      col: 2,
      row: 1,
      w: 1,
      h: 1,
    });
  });
});

describe("summonedTokenCells", () => {
  const small = { w: 1, h: 1 };
  const medium = { w: 1, h: 3 };
  const large = { w: 2, h: 5 };

  it("rounds the equal-area square up on a 1.5 m grid", () => {
    expect([small, medium, large].map((f) => summonedTokenCells(f, 1.5, false))).toEqual([1, 2, 3]);
  });

  it("rounds the equal-area square up on a 1 m grid", () => {
    expect([small, medium, large].map((f) => summonedTokenCells(f, 1, false))).toEqual([1, 2, 4]);
  });

  it("is never smaller than one square", () => {
    expect(summonedTokenCells(small, 5, false)).toBe(1);
  });

  it("is exact on a gridless scene", () => {
    expect(summonedTokenCells(large, 1, true)).toBeCloseTo(Math.sqrt(10));
  });
});

describe("summonedFolder", () => {
  const originalFolders = game.folders;
  // the shared i18n mock formats a key with no placeholders like this
  const localizedName = "RQG.ChatMessage.SpellCast.Summon.Folder + ";
  let create: ReturnType<typeof vi.fn>;

  function folder(name: string, type: string, flags: Record<string, unknown> = {}): any {
    const result: any = {
      name,
      type,
      flags: { rqg: { ...flags } },
      getFlag: (scope: string, key: string) => result.flags[scope]?.[key],
      setFlag: vi.fn(async (scope: string, key: string, value: unknown) => {
        result.flags[scope][key] = value;
      }),
    };
    return result;
  }

  function withFolders(folders: any[]): void {
    (game as any).folders = { filter: (fn: (f: any) => boolean) => folders.filter(fn) };
  }

  beforeEach(() => {
    create = vi.fn(async (data: any) => data);
    vi.stubGlobal("Folder", { implementation: { create } });
  });
  afterEach(() => {
    (game as any).folders = originalFolders;
    vi.unstubAllGlobals();
  });

  it("finds the flagged folder whatever its name, so a new world language makes no second one", async () => {
    const flagged = folder("Beschworen", "Actor", { summonedFolder: true });
    withFolders([folder(localizedName, "Actor"), flagged]);

    expect(await summonedFolder()).toBe(flagged);
    expect(create).not.toHaveBeenCalled();
  });

  it("flags a folder made before the flag, found by its localized name", async () => {
    const old = folder(localizedName, "Actor");
    withFolders([folder(localizedName, "Item"), old]);

    expect(await summonedFolder()).toBe(old);
    expect(old.setFlag).toHaveBeenCalledWith("rqg", "summonedFolder", true);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a flagged Actor folder when there is none", async () => {
    withFolders([]);

    await summonedFolder();

    expect(create).toHaveBeenCalledWith({
      name: localizedName,
      type: "Actor",
      flags: { rqg: { summonedFolder: true } },
    });
  });
});
