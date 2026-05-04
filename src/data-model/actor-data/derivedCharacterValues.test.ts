import { describe, expect, it } from "vitest";
import { getCharacteristicDerivedValues } from "./derivedCharacterValues";

describe("getCharacteristicDerivedValues", () => {
  it("computes expected values for an average non-creature", () => {
    const result = getCharacteristicDerivedValues({
      str: 13,
      con: 11,
      siz: 13,
      dex: 15,
      int: 12,
      pow: 15,
      cha: 11,
      isCreature: false,
    });

    expect(result.dexStrikeRank).toBe(2);
    expect(result.sizStrikeRank).toBe(2);
    expect(result.damageBonus).toBe("1d4");
    expect(result.healingRate).toBe(2);
    expect(result.spiritCombatDamage).toBe("1d6+1");
    expect(result.skillCategoryModifiers).toStrictEqual({
      agility: 5,
      communication: 0,
      knowledge: 0,
      magic: 5,
      manipulation: 5,
      perception: 0,
      stealth: 0,
      meleeWeapons: 5,
      missileWeapons: 5,
      naturalWeapons: 5,
      shields: 5,
      otherSkills: 0,
    });
  });

  it("returns defaults for missing characteristics and creature modifiers", () => {
    const result = getCharacteristicDerivedValues({
      str: undefined,
      con: undefined,
      siz: undefined,
      dex: undefined,
      int: undefined,
      pow: undefined,
      cha: undefined,
      isCreature: true,
    });

    expect(result.dexStrikeRank).toBeUndefined();
    expect(result.sizStrikeRank).toBeUndefined();
    expect(result.damageBonus).toBe("0");
    expect(result.healingRate).toBe(0);
    expect(result.spiritCombatDamage).toBe("0");
    expect(result.skillCategoryModifiers).toStrictEqual({
      agility: 0,
      communication: 0,
      knowledge: 0,
      magic: 0,
      manipulation: 0,
      perception: 0,
      stealth: 0,
      meleeWeapons: 0,
      missileWeapons: 0,
      naturalWeapons: 0,
      shields: 0,
      otherSkills: 0,
    });
  });
});
