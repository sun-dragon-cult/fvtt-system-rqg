import { describe, expect, it, vi } from "vitest";
import { PassionDataModel } from "./passion-data-model";
import { RuneDataModel } from "./rune-data-model";

describe("PassionDataModel.migrateData", () => {
  it("keeps a passion key and custom text", () => {
    expect(PassionDataModel.migrateData({ passion: "Loyalty" })["passion"]).toBe("Loyalty");
    expect(PassionDataModel.migrateData({ passion: "Envy" })["passion"]).toBe("Envy");
  });

  it("turns a label in the current language into its key", () => {
    const i18n = game.i18n as unknown as { localize: (id: string) => string };
    const localize = i18n.localize;
    i18n.localize = vi.fn((id: string) =>
      id === "RQG.Item.Passion.PassionEnum.Loyalty" ? "Lealtad" : id,
    );
    try {
      expect(PassionDataModel.migrateData({ passion: "Lealtad" })["passion"]).toBe("Loyalty");
    } finally {
      i18n.localize = localize;
    }
  });
});

describe("RuneDataModel.migrateData", () => {
  it("turns the old {type, name} object into the type", () => {
    expect(
      RuneDataModel.migrateData({ runeType: { type: "power", name: "Poder" } })["runeType"],
    ).toBe("power");
  });

  it("normalises the type in the old object, and falls back to form without one", () => {
    expect(
      RuneDataModel.migrateData({ runeType: { type: "Power", name: "Power" } })["runeType"],
    ).toBe("power");
    expect(RuneDataModel.migrateData({ runeType: { name: "Power" } })["runeType"]).toBe("form");
    expect(RuneDataModel.migrateData({ runeType: { type: "", name: "x" } })["runeType"]).toBe(
      "form",
    );
  });

  it("turns an older capitalised rune type into the type", () => {
    expect(RuneDataModel.migrateData({ runeType: "Power" })["runeType"]).toBe("power");
    expect(RuneDataModel.migrateData({ runeType: "element" })["runeType"]).toBe("element");
  });
});
