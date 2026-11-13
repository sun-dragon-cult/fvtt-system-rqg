import { describe, expect, it } from "vitest";
import {
  cannotResistWithPower,
  hasPower,
  resolveCharacteristicLabel,
  resolveCharacteristicValue,
  resolveResistanceStat,
} from "./resistance-roll-shared";

const actorWith = (power: number | null, magicPoints: number | null) =>
  ({
    system: {
      characteristics: { power: { value: power }, strength: { value: 12 } },
      attributes: { magicPoints: { value: magicPoints, max: 15 } },
    },
  }) as any;

describe("resistance stats", () => {
  const actor = actorWith(15, 9);

  it("reads a characteristic", () => {
    expect(resolveCharacteristicValue(actor, "power")).toBe(15);
    expect(resolveCharacteristicValue(actor, "strength")).toBe(12);
  });

  it("reads current magic points", () => {
    expect(resolveCharacteristicValue(actor, "magicPoints")).toBe(9);
    expect(resolveCharacteristicLabel("magicPoints")).toContain("RQG.Actor.Attributes.MagicPoints");
  });
});

describe("POW resistance without POW (RBM p.6)", () => {
  it("resists with POW when the side has it", () => {
    const actor = actorWith(15, 9);
    expect(hasPower(actor)).toBe(true);
    expect(resolveResistanceStat(actor, "power")).toBe("power");
    expect(resolveCharacteristicValue(actor, "power")).toBe(15);
    expect(resolveCharacteristicLabel("power", actor)).toContain("RQG.Actor.Characteristics.power");
    expect(cannotResistWithPower(actor)).toBe(false);
  });

  it.each([
    ["empty", null],
    ["0", 0],
  ])("resists with current magic points when POW is %s", (_label, power) => {
    const actor = actorWith(power, 12);
    expect(hasPower(actor)).toBe(false);
    expect(resolveResistanceStat(actor, "power")).toBe("magicPoints");
    expect(resolveCharacteristicValue(actor, "power")).toBe(12);
    expect(resolveCharacteristicLabel("power", actor)).toContain(
      "RQG.Actor.Attributes.MagicPoints",
    );
    expect(cannotResistWithPower(actor)).toBe(false);
  });

  it("can't resist with neither POW nor magic points", () => {
    for (const actor of [actorWith(null, 0), actorWith(0, null), actorWith(null, null)]) {
      expect(resolveCharacteristicValue(actor, "power")).toBe(0);
      expect(cannotResistWithPower(actor)).toBe(true);
    }
  });

  it("leaves other characteristics alone", () => {
    const actor = actorWith(null, 12);
    expect(resolveResistanceStat(actor, "strength")).toBe("strength");
    expect(resolveCharacteristicValue(actor, "strength")).toBe(12);
  });

  it("labels POW itself without an actor", () => {
    expect(resolveCharacteristicLabel("power")).toContain("RQG.Actor.Characteristics.power");
  });
});
