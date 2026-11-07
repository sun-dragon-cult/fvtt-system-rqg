import { describe, expect, it } from "vitest";
import { getConvertedFieldUpdates } from "./persist-converted-item-fields";

const item = (_id: string, type: string, system: Record<string, unknown>) => ({
  _source: { _id, type, system },
});

describe("getConvertedFieldUpdates", () => {
  it("writes known passion keys and rune types, and skips custom passions and other items", () => {
    expect(
      getConvertedFieldUpdates([
        item("a", "passion", { passion: "Loyalty" }),
        item("b", "passion", { passion: "Envy" }),
        item("c", "rune", { runeType: "power" }),
        item("d", "skill", { passion: "Loyalty" }),
      ]),
    ).toEqual([
      { _id: "a", "system.passion": "Loyalty" },
      { _id: "c", "system.runeType": "power" },
    ]);
  });

  it("writes armor with a known type or material, and skips custom armor", () => {
    expect(
      getConvertedFieldUpdates([
        item("a", "armor", { armorType: "Cuirass", material: "Bronze" }),
        item("b", "armor", { armorType: "Breastplate", material: "Bronze" }),
      ]),
    ).toEqual([{ _id: "a", "system.armorType": "Cuirass", "system.material": "Bronze" }]);
  });

  it("writes the maneuvers of each weapon usage that has a known maneuver", () => {
    const oneHand = [
      { name: "Cut", damageType: "slash" },
      { name: "Sweep", damageType: "crush" },
    ];
    expect(
      getConvertedFieldUpdates([
        item("a", "weapon", {
          usage: {
            oneHand: { combatManeuvers: oneHand },
            twoHand: { combatManeuvers: [{ name: "Sweep", damageType: "crush" }] },
            missile: { combatManeuvers: [] },
          },
        }),
        item("b", "weapon", {
          usage: { oneHand: { combatManeuvers: [{ name: "Sweep", damageType: "crush" }] } },
        }),
      ]),
    ).toEqual([{ _id: "a", "system.usage.oneHand.combatManeuvers": oneHand }]);
  });
});
