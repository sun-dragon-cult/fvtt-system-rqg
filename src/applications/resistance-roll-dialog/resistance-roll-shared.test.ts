import { describe, expect, it } from "vitest";
import { resolveCharacteristicLabel, resolveCharacteristicValue } from "./resistance-roll-shared";

const actor = {
  system: {
    characteristics: { power: { value: 15 } },
    attributes: { magicPoints: { value: 9, max: 15 } },
  },
} as any;

describe("resistance stats", () => {
  it("reads a characteristic", () => {
    expect(resolveCharacteristicValue(actor, "power")).toBe(15);
  });

  it("reads current magic points, which undead resist Turn Undead with", () => {
    expect(resolveCharacteristicValue(actor, "magicPoints")).toBe(9);
    expect(resolveCharacteristicLabel("magicPoints")).toContain("RQG.Actor.Attributes.MagicPoints");
  });
});
