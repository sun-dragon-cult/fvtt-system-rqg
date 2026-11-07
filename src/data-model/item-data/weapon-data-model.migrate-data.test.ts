import { describe, expect, it, vi } from "vitest";
import { WeaponDataModel } from "./weapon-data-model";

describe("WeaponDataModel.migrateData damageType cleanup", () => {
  it("rewrites the retired 'cut' damageType to 'slash' on combat maneuvers", () => {
    const source = {
      rate: 1,
      usage: {
        oneHand: {
          combatManeuvers: [
            { name: "Claw", damageType: "cut", description: "" },
            { name: "Parry", damageType: "parry", description: "" },
          ],
        },
      },
    };

    const migrated = WeaponDataModel.migrateData(source);

    expect((migrated["usage"] as any).oneHand.combatManeuvers).toEqual([
      { name: "Claw", damageType: "slash", description: "" },
      { name: "Parry", damageType: "parry", description: "" },
    ]);
  });

  it("leaves already-valid damageType values untouched", () => {
    const source = {
      rate: 1,
      usage: {
        oneHand: {
          combatManeuvers: [{ name: "Hit", damageType: "crush", description: "" }],
        },
      },
    };

    const migrated = WeaponDataModel.migrateData(source);

    expect((migrated["usage"] as any).oneHand.combatManeuvers).toEqual([
      { name: "Hit", damageType: "crush", description: "" },
    ]);
  });

  it("does nothing when usage data is missing", () => {
    const source = { rate: 1 };

    expect(() => WeaponDataModel.migrateData(source)).not.toThrow();
  });
});

describe("WeaponDataModel.migrateData combat maneuver names", () => {
  const names = (source: Record<string, unknown>) =>
    ((WeaponDataModel.migrateData(source)["usage"] as any).oneHand.combatManeuvers as any[]).map(
      (m) => m.name,
    );
  const weapon = (...maneuverNames: string[]) => ({
    rate: 0,
    usage: {
      oneHand: {
        combatManeuvers: maneuverNames.map((name) => ({ name, damageType: "crush" })),
      },
    },
  });

  it("keeps keys and custom names, trimmed", () => {
    expect(names(weapon("HeadButt", " Sweep "))).toEqual(["HeadButt", "Sweep"]);
  });

  it("turns a label in the current language into its key, and is idempotent", () => {
    const i18n = game.i18n as unknown as { localize: (id: string) => string };
    const localize = i18n.localize;
    i18n.localize = vi.fn((id: string) =>
      id === "RQG.Item.Weapon.combatManeuver.HeadButt" ? "Cabezazo" : id,
    );
    try {
      const once = WeaponDataModel.migrateData(weapon("Cabezazo", "Barrido"));
      expect(names(once)).toEqual(["HeadButt", "Barrido"]);
      expect(names(structuredClone(once))).toEqual(["HeadButt", "Barrido"]);
    } finally {
      i18n.localize = localize;
    }
  });
});
