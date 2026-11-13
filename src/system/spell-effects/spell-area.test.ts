import { describe, expect, it } from "vitest";
import { areaExtent, spellRangeInMeters } from "./spell-area";
import { cornerOutOfReach, polygonAreaInMeters } from "./place-spell-area";

describe("spell areas", () => {
  it("uses the standard casting range of the spell's magic (RBM p.6)", () => {
    expect(spellRangeInMeters({ type: "runeMagic" } as any)).toBe(160);
    expect(spellRangeInMeters({ type: "spiritMagic" } as any)).toBe(50);
  });

  it("measures how far an area reaches from its center, a square to its corners", () => {
    expect(areaExtent({ kind: "circle", radius: 10 })).toBe(10);
    expect(areaExtent({ kind: "square", side: 10 })).toBeCloseTo(7.07, 2);
    expect(areaExtent({ kind: "polygon", corners: 4, maxArea: 100 })).toBe(0);
  });

  it("measures a clicked polygon in square meters, by the scene's grid", () => {
    // 100 px squares of 1.5 m: a 4 × 4 square of them is 6 m × 6 m
    const grid = { size: 100, distance: 1.5, units: "m" };
    const square = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 400 },
      { x: 0, y: 400 },
    ];
    expect(polygonAreaInMeters(square, grid)).toBeCloseTo(36);
    expect(polygonAreaInMeters([...square].reverse(), grid)).toBeCloseTo(36);
    expect(polygonAreaInMeters(square, { size: 100, distance: 5, units: "ft" })).toBeCloseTo(
      37.16,
      2,
    );
  });
});

describe("cornerOutOfReach", () => {
  const point = { x: 0, y: 0 };
  const yes = () => true;
  const no = () => false;

  it("accepts a corner in range and in sight", () => {
    expect(cornerOutOfReach(point, yes, yes)).toBeUndefined();
  });

  it("rejects a corner the caster can't see, like a circle's or square's center (RBM p.6)", () => {
    expect(cornerOutOfReach(point, yes, no)).toBe("RQG.SpellArea.OutOfSight");
  });

  it("names range first when a corner is both out of range and out of sight", () => {
    expect(cornerOutOfReach(point, no, no)).toBe("RQG.SpellArea.OutOfRange");
  });
});
