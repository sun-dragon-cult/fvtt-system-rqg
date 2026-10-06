import { describe, expect, it } from "vitest";
import { nearestFreeCell } from "./summon";

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
