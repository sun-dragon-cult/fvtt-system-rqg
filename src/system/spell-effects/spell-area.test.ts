import { afterEach, describe, expect, it, vi } from "vitest";
import { summonerToken } from "./token-cells";
import { clearApplyClaims } from "./spell-apply-claims";
import { areaExtent, handleCreateSpellAreaQuery, spellRangeInMeters } from "./spell-area";
import { polygonAreaInMeters } from "./place-spell-area";

vi.mock("./token-cells", () => ({ summonerToken: vi.fn(async () => undefined) }));

describe("spell areas", () => {
  it("uses the standard casting range of the spell's magic (RBM p.4)", () => {
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

describe("handleCreateSpellAreaQuery", () => {
  const user = { isGM: false } as unknown as User;
  const data = {
    request: { castMessageId: "record", entryId: "entry", applyId: "click" },
    spellUuid: "",
    targetActorUuid: "",
    targetName: "",
    cast: {} as any,
    casterTokenUuid: "",
    shape: { type: "circle", x: 0, y: 0, radius: 100 } as any,
    duration: null,
    visible: false,
  };

  afterEach(() => {
    clearApplyClaims();
    vi.unstubAllGlobals();
  });

  it("does nothing for an entry that was already applied", async () => {
    const record = {
      type: "spellCast",
      system: { targets: [{ id: "entry", actorUuid: "Actor.v", tokenUuid: "", stage: "applied" }] },
    };
    vi.stubGlobal("game", { messages: { get: () => record } });
    expect(await handleCreateSpellAreaQuery(data, { user })).toBeUndefined();
    expect(summonerToken).not.toHaveBeenCalled();
  });
});
