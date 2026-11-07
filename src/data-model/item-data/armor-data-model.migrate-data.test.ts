import { describe, expect, it, vi } from "vitest";
import { ArmorDataModel } from "./armor-data-model";

describe("ArmorDataModel.migrateData", () => {
  it("turns labels into keys and keeps keys and custom text", () => {
    const i18n = game.i18n as unknown as { localize: (id: string) => string };
    const localize = i18n.localize;
    const spanish: Record<string, string> = {
      "RQG.Item.Armor.ArmorType.Cuirass": "Coraza",
      "RQG.Item.Armor.ArmorMaterial.HeavyLeather": "Cuero pesado",
    };
    i18n.localize = vi.fn((id: string) => spanish[id] ?? id);
    try {
      const migrated = ArmorDataModel.migrateData({
        armorType: "Coraza",
        material: "Cuero pesado",
      });
      expect([migrated["armorType"], migrated["material"]]).toEqual(["Cuirass", "HeavyLeather"]);
      const kept = ArmorDataModel.migrateData({ armorType: "Greaves", material: "Mithril" });
      expect([kept["armorType"], kept["material"]]).toEqual(["Greaves", "Mithril"]);
    } finally {
      i18n.localize = localize;
    }
  });
});
