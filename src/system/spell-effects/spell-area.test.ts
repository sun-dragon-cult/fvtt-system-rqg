import { describe, expect, it } from "vitest";
import { areaExtent, spellRangeInMeters } from "./spell-area";

describe("spell areas", () => {
  it("uses the standard casting range of the spell's magic (RBM p.4)", () => {
    expect(spellRangeInMeters({ type: "runeMagic" } as any)).toBe(160);
    expect(spellRangeInMeters({ type: "spiritMagic" } as any)).toBe(50);
  });

  it("measures how far an area reaches from its center, a square to its corners", () => {
    expect(areaExtent({ kind: "circle", radius: 10 })).toBe(10);
    expect(areaExtent({ kind: "square", side: 10 })).toBeCloseTo(7.07, 2);
  });
});
