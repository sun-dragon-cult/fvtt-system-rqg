import { afterEach, beforeEach, describe, expect, it } from "vitest";
import enLocale from "../../static/i18n/en/uiContent.json";
import { buildItemName } from "./item-name";

const english = (key: string): unknown =>
  key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], enLocale);

describe("buildItemName", () => {
  const i18n = game.i18n as unknown as { format: unknown; localize: unknown };
  const { format, localize } = i18n;
  let overrides: Record<string, string> = {};

  beforeEach(() => {
    overrides = {};
    const translate = (key: string, data: Record<string, string> = {}) => {
      const template = overrides[key] ?? english(key);
      return typeof template === "string"
        ? template.replace(/\{(\w+)\}/g, (_, name: string) => data[name] ?? `{${name}}`)
        : key;
    };
    i18n.format = translate;
    i18n.localize = translate;
  });
  afterEach(() => {
    i18n.format = format;
    i18n.localize = localize;
  });

  it("builds the English names the sheets built before", () => {
    expect(buildItemName("rune", { rune: "Air", runeType: "element" })).toBe("Air (element)");
    expect(buildItemName("passion", { passion: "Loyalty", subject: "Clan" })).toBe(
      "Loyalty (Clan)",
    );
    expect(buildItemName("skill", { skillName: "Speak", specialization: "Tradetalk" })).toBe(
      "Speak (Tradetalk)",
    );
    expect(buildItemName("occupation", { occupation: "Priest", specialization: "Orlanth" })).toBe(
      "Priest (Orlanth)",
    );
    expect(buildItemName("homeland", { homeland: "Sartar", region: "Dragon Pass" })).toBe(
      "Sartar (Dragon Pass)",
    );
    expect(
      buildItemName("cult", {
        deity: "Orlanth",
        joinedCults: [{ cultName: "Orlanth Adventurous" }, { cultName: "Orlanth Thunderous" }],
      }),
    ).toBe("Orlanth Adventurous and Orlanth Thunderous (Orlanth)");
  });

  it("leaves out an empty optional part instead of leaving empty parentheses", () => {
    expect(buildItemName("passion", { passion: "Hate", subject: " " })).toBe("Hate");
    expect(buildItemName("skill", { skillName: "Dodge", specialization: "" })).toBe("Dodge");
    expect(buildItemName("homeland", { homeland: "Esrolia" })).toBe("Esrolia");
    expect(
      buildItemName("cult", { deity: "Ernalda", joinedCults: [{ cultName: "Ernalda" }] }),
    ).toBe("Ernalda");
  });

  it("builds armor names without a leading space or empty parentheses", () => {
    expect(
      buildItemName("armor", { namePrefix: "", armorType: "Cuirass", material: "HeavyLeather" }),
    ).toBe("Cuirass (Heavy Leather)");
    expect(
      buildItemName("armor", { namePrefix: "Fine", armorType: "Cuirass", material: "Leather" }),
    ).toBe("Fine Cuirass (Leather)");
    expect(buildItemName("armor", { namePrefix: "", armorType: "Greaves", material: "" })).toBe(
      "Greaves",
    );
    expect(
      buildItemName("armor", { namePrefix: "Old", armorType: "Breastplate", material: "Mithril" }),
    ).toBe("Old Breastplate (Mithril)");
  });

  it("uses a translated pattern, so a language can reorder the parts", () => {
    overrides = {
      "RQG.Item.Armor.NamePattern": "{armorType} de {material}",
      "RQG.Item.Armor.NamePrefixPattern": "{name} {prefix}",
      "RQG.Item.Armor.ArmorType.Cuirass": "Coraza",
      "RQG.Item.Armor.ArmorMaterial.Leather": "cuero",
    };
    expect(
      buildItemName("armor", { namePrefix: "fina", armorType: "Cuirass", material: "Leather" }),
    ).toBe("Coraza de cuero fina");
  });

  it("gives no name when there is nothing to name the item by", () => {
    expect(buildItemName("passion", { passion: "", subject: "" })).toBe("");
    expect(buildItemName("armor", {})).toBe("");
    expect(buildItemName("weapon", { name: "Broadsword" })).toBe("");
  });
});
