import { describe, expect, it } from "vitest";
import { areaExtent, spellRangeInMetres } from "./spell-area";

describe("spell areas", () => {
  it("uses the standard casting range of the spell's magic (RBM p.4)", () => {
    expect(spellRangeInMetres({ type: "runeMagic" } as any)).toBe(160);
    expect(spellRangeInMetres({ type: "spiritMagic" } as any)).toBe(50);
  });

  it("measures how far an area reaches from its centre, a square to its corners", () => {
    expect(areaExtent({ kind: "circle", radius: 10 })).toBe(10);
    expect(areaExtent({ kind: "square", side: 10 })).toBeCloseTo(7.07, 2);
  });
});
