import { describe, expect, it } from "vitest";
import { checkFieldModeContract, isPadPath } from "./field-mode-contract";

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
    for (const t of ["add", "multiply", "override", "upgrade", "downgrade", "custom.3"]) {
      expect(checkFieldModeContract("system.baseChance", t)).toBeNull();
    }
  });

  it("allows add / subtract / upgrade / downgrade on a pad", () => {
    for (const t of ["add", "subtract", "upgrade", "downgrade"]) {
      expect(checkFieldModeContract("system.effect.add.melee.attack", t)).toBeNull();
    }
  });

  it("flags multiply on a pad as a no-op", () => {
    expect(checkFieldModeContract("system.effect.add.melee.attack", "multiply")).toBe(
      "pad-multiply-noop",
    );
  });

  it("flags override on a pad as discarding stacking", () => {
    expect(checkFieldModeContract("system.effect.add.magicPoints.max", "override")).toBe(
      "pad-override-discards-stacking",
    );
  });
});
