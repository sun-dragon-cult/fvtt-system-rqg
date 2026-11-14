import { describe, expect, it, vi } from "vitest";
import { rectGap, spellTargetReachLabel, spellTargetReachWarning } from "./spell-target-reach";

const target = (overrides: Partial<Parameters<typeof spellTargetReachWarning>[1]> = {}) => ({
  isCaster: false,
  inRange: () => true,
  inSight: () => true,
  touching: () => true,
  ...overrides,
});

describe("spellTargetReachWarning (RBM p.6)", () => {
  it("marks a ranged spell's target beyond its range, before checking sight", () => {
    const inSight = vi.fn(() => false);
    expect(spellTargetReachWarning("ranged", target({ inRange: () => false, inSight }))).toBe(
      "outOfRange",
    );
    expect(inSight).not.toHaveBeenCalled();
  });

  it("marks a ranged spell's target in range that the caster can't see", () => {
    expect(spellTargetReachWarning("ranged", target({ inSight: () => false }))).toBe("outOfSight");
  });

  it("passes a ranged spell's target in range and in sight", () => {
    expect(spellTargetReachWarning("ranged", target())).toBe("");
  });

  it("marks a touch spell's target the caster isn't touching, whatever the sight", () => {
    expect(spellTargetReachWarning("touch", target({ touching: () => false }))).toBe("notTouching");
    expect(spellTargetReachWarning("touch", target({ inSight: () => false }))).toBe("");
  });

  it("doesn't check self, special or unset ranges, nor the caster as target", () => {
    const far = target({ inRange: () => false, inSight: () => false, touching: () => false });
    expect(spellTargetReachWarning("self", far)).toBe("");
    expect(spellTargetReachWarning("special", far)).toBe("");
    expect(spellTargetReachWarning("", far)).toBe("");
    expect(spellTargetReachWarning("ranged", { ...far, isCaster: true })).toBe("");
    expect(spellTargetReachWarning("touch", { ...far, isCaster: true })).toBe("");
  });
});

describe("rectGap", () => {
  const square = (x: number, y: number) => ({ x, y, width: 100, height: 100 });

  it("is 0 for tokens side by side, diagonal or overlapping", () => {
    expect(rectGap(square(0, 0), square(100, 0))).toBe(0);
    expect(rectGap(square(0, 0), square(100, 100))).toBe(0);
    expect(rectGap(square(0, 0), square(50, 50))).toBe(0);
  });

  it("is the widest gap between tokens apart", () => {
    expect(rectGap(square(0, 0), square(200, 0))).toBe(100);
    expect(rectGap(square(0, 0), square(150, 400))).toBe(300);
  });
});

describe("spellTargetReachLabel", () => {
  it("names a warning, and nothing without one", () => {
    expect(spellTargetReachLabel("outOfRange")).toContain("RQG.Dialog.SpellCast.Reach.outOfRange");
    expect(spellTargetReachLabel("")).toBe("");
    expect(spellTargetReachLabel(undefined)).toBe("");
  });
});
