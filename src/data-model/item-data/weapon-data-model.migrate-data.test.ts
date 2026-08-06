import { describe, expect, it } from "vitest";
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
