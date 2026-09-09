import { describe, expect, it } from "vitest";
import { checkFieldModeContract, isPadPath, normalizeChangeType } from "./field-mode-contract";

describe("normalizeChangeType", () => {
  it("prefers the v14 string type", () => {
    expect(normalizeChangeType({ type: "upgrade" })).toBe("upgrade");
    expect(normalizeChangeType({ type: "add", mode: 5 })).toBe("add");
  });

  it("collapses custom.<n> to custom", () => {
    expect(normalizeChangeType({ type: "custom.7" })).toBe("custom");
  });

  it("falls back to the legacy numeric mode", () => {
    expect(normalizeChangeType({ mode: 1 })).toBe("multiply");
    expect(normalizeChangeType({ mode: 4 })).toBe("upgrade");
    expect(normalizeChangeType({ mode: 0 })).toBe("custom");
  });

  it("defaults to add when neither is usable", () => {
    expect(normalizeChangeType({})).toBe("add");
    expect(normalizeChangeType({ type: "nonsense" })).toBe("add");
  });
});

describe("isPadPath", () => {
  it("recognises system.effect.add.* paths", () => {
    expect(isPadPath("system.effect.add.melee.attack")).toBe(true);
    expect(isPadPath("system.effect.add.magicPoints.max")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isPadPath("system.baseChance")).toBe(false);
    expect(isPadPath("system.effect.multiply.hitPoints.max")).toBe(false);
  });
});

describe("checkFieldModeContract", () => {
  it("allows any mode on a non-pad path", () => {
    for (const t of ["add", "multiply", "override", "upgrade", "downgrade"] as const) {
      expect(checkFieldModeContract("system.baseChance", t)).toEqual({ ok: true });
    }
  });

  it("allows add / subtract / upgrade / downgrade on a pad", () => {
    for (const t of ["add", "subtract", "upgrade", "downgrade"] as const) {
      expect(checkFieldModeContract("system.effect.add.melee.attack", t)).toEqual({ ok: true });
    }
  });

  it("flags multiply on a pad as a no-op", () => {
    expect(checkFieldModeContract("system.effect.add.melee.attack", "multiply")).toEqual({
      ok: false,
      reason: "pad-multiply-noop",
      detail: { systemPath: "system.effect.add.melee.attack" },
    });
  });

  it("flags override on a pad as discarding stacking", () => {
    expect(checkFieldModeContract("system.effect.add.magicPoints.max", "override")).toMatchObject({
      ok: false,
      reason: "pad-override-discards-stacking",
    });
  });
});
