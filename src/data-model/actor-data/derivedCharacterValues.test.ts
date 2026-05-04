import { describe, expect, it } from "vitest";
import {
  applyEquippedEncumbrancePenalty,
  getCharacteristicDerivedValues,
} from "./derivedCharacterValues";

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

describe("applyEquippedEncumbrancePenalty", () => {
  it("applies penalties only to affected categories", () => {
    const base = {
      agility: 10,
      communication: 5,
      knowledge: 6,
      magic: 7,
      manipulation: 8,
      perception: 9,
      stealth: 4,
      meleeWeapons: 3,
      missileWeapons: 2,
      naturalWeapons: 1,
      shields: 0,
      otherSkills: 11,
    };

    const result = applyEquippedEncumbrancePenalty(base, -2);

    expect(result).toStrictEqual({
      agility: 0,
      communication: 5,
      knowledge: 6,
      magic: 7,
      manipulation: -2,
      perception: 9,
      stealth: -6,
      meleeWeapons: -7,
      missileWeapons: -8,
      naturalWeapons: -9,
      shields: -10,
      otherSkills: 11,
    });
  });

  it("does not mutate base modifiers", () => {
    const base = {
      agility: 5,
      communication: 1,
      knowledge: 1,
      magic: 1,
      manipulation: 5,
      perception: 1,
      stealth: 5,
      meleeWeapons: 5,
      missileWeapons: 5,
      naturalWeapons: 5,
      shields: 5,
      otherSkills: 1,
    };

    const result = applyEquippedEncumbrancePenalty(base, -1);

    expect(base.agility).toBe(5);
    expect(base.manipulation).toBe(5);
    expect(base.stealth).toBe(5);
    expect(result.agility).toBe(0);
  });
});
