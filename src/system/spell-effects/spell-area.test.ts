import { afterEach, describe, expect, it, vi } from "vitest";
import { areaExtent, handleCreateSpellAreaQuery, spellRangeInMeters } from "./spell-area";
import { areaPointOutOfReach, placeCancellable, polygonAreaInMeters } from "./place-spell-area";
import { summonerDocument } from "./token-cells";
import { clearApplyClaims } from "./spell-apply-claims";

vi.mock("./token-cells", () => ({
  summonerToken: vi.fn(async () => undefined),
  summonerDocument: vi.fn(async () => undefined),
}));

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

describe("areaPointOutOfReach", () => {
  const yes = () => true;
  const no = () => false;

  it.each([
    ["in range and in sight", yes, yes, undefined],
    ["out of sight (RBM p.6)", yes, no, "RQG.SpellArea.OutOfSight"],
    ["out of range, before sight", no, no, "RQG.SpellArea.OutOfRange"],
  ])("tells a point %s", (_label, inRange, inSight, expected) => {
    expect(areaPointOutOfReach({ x: 0, y: 0 }, inRange, inSight)).toBe(expected);
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

  it("answers that an entry already applied was taken, doing nothing", async () => {
    const record = {
      type: "spellCast",
      system: { targets: [{ id: "entry", actorUuid: "Actor.v", tokenUuid: "", stage: "applied" }] },
    };
    vi.stubGlobal("game", { messages: { get: () => record } });
    expect(await handleCreateSpellAreaQuery(data, { user })).toEqual({ outcome: "taken" });
    expect(summonerDocument).not.toHaveBeenCalled();
  });
});

describe("placeCancellable", () => {
  function fakeLayer(current?: object) {
    const layer = {
      _placementContext: current as object | undefined,
      _cancelPlacement: vi.fn(() => {
        layer._placementContext = undefined;
        resolvePlacement?.(null);
      }),
    };
    let resolvePlacement: ((value: null) => void) | undefined;
    const start = () =>
      new Promise<null>((resolve) => {
        resolvePlacement = resolve;
        layer._placementContext = {};
      });
    return { layer, start };
  }

  it("cancels its placement when the signal aborts", async () => {
    const { layer, start } = fakeLayer();
    const controller = new AbortController();
    const placing = placeCancellable(layer, start, controller.signal);
    controller.abort();
    expect(await placing).toBeNull();
    expect(layer._cancelPlacement).toHaveBeenCalledOnce();
  });

  it("cancels at once with a signal already aborted", async () => {
    const { layer, start } = fakeLayer();
    expect(await placeCancellable(layer, start, AbortSignal.abort())).toBeNull();
    expect(layer._cancelPlacement).toHaveBeenCalledOnce();
  });

  it("leaves a placement started after it alone", async () => {
    const { layer, start } = fakeLayer();
    const controller = new AbortController();
    void placeCancellable(layer, start, controller.signal);
    layer._placementContext = {};
    controller.abort();
    expect(layer._cancelPlacement).not.toHaveBeenCalled();
  });

  it("leaves an earlier placement alone when its own didn't start", async () => {
    const { layer } = fakeLayer({});
    await expect(
      placeCancellable(layer, () => Promise.reject(new Error("not ready")), AbortSignal.abort()),
    ).rejects.toThrow("not ready");
    expect(layer._cancelPlacement).not.toHaveBeenCalled();
  });
});
