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
});
