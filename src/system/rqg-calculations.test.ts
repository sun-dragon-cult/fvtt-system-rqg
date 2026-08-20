import { RqgCalculations } from "./rqg-calculations";
import { describe, it, expect } from "vitest";

describe("Skill Category Modifiers are correct for", () => {
  it("average character with normal rules", () => {
    const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      13,
      11,
      15,
      12,
      15,
      11,
      false,
    );
    expect(skillCategoryModifiers).toStrictEqual({
      agility: 5,
      communication: 0,
      knowledge: 0,
      magic: 5,
      manipulation: 5,
      perception: 0,
      stealth: 5,
      meleeWeapons: 5,
      missileWeapons: 5,
      naturalWeapons: 5,
      shields: 5,
      otherSkills: 0,
    });
  });

  it("creature", () => {
    const skillCategoryModifiers = RqgCalculations.skillCategoryModifiers(
      170,
      65,
      13,
      19,
      26,
      21,
      true,
    );
    expect(skillCategoryModifiers).toStrictEqual({
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

describe("hit points calculations are correct for", () => {
  it("normal character", () => {
    const hp = RqgCalculations.hitPoints(11, 7, 13);
    expect(hp).toBe(10);
  });

  it("spirit without con", () => {
    const hp = RqgCalculations.hitPoints(undefined, undefined, 13);
    expect(hp).toBe(undefined);
  });

  it("Elemental without str", () => {
    const hp = RqgCalculations.hitPoints(18, undefined, 17);
    expect(hp).toBe(19); // TODO should not have CON but HP - model elementals with CON ?
  });

  it("Sprul-pa no total HP", () => {
    const hp = RqgCalculations.hitPoints(undefined, 11, 7);
    expect(hp).toBe(undefined);
  });

  it("Ghoul without pow", () => {
    const hp = RqgCalculations.hitPoints(11, 13, undefined);
    expect(hp).toBe(12);
  });
});

describe("damage bonus calculations are correct for", () => {
  it("normal character", () => {
    const hp = RqgCalculations.damageBonus(18, 18);
    expect(hp).toBe("1d6");
  });

  it("No STR", () => {
    const hp = RqgCalculations.damageBonus(undefined, 18);
    expect(hp).toBe("0");
  });

  it("No SIZ", () => {
    const hp = RqgCalculations.damageBonus(32, undefined);
    expect(hp).toBe("0");
  });
});

describe("magic point recovery points per day are correct for", () => {
  it("normal (RAW baseline) rate factor recovers full max in a day", () => {
    expect(RqgCalculations.magicPointRecoveryPointsPerDay(18, 1)).toBe(18);
  });

  it("doubled rate factor", () => {
    expect(RqgCalculations.magicPointRecoveryPointsPerDay(18, 2)).toBe(36);
  });

  it("halved rate factor", () => {
    expect(RqgCalculations.magicPointRecoveryPointsPerDay(11, 0.5)).toBe(5.5);
  });

  it("zero rate factor", () => {
    expect(RqgCalculations.magicPointRecoveryPointsPerDay(18, 0)).toBe(0);
  });

  it("no max magic points", () => {
    expect(RqgCalculations.magicPointRecoveryPointsPerDay(undefined, 1)).toBe(0);
  });

  it("undefined rate factor", () => {
    expect(RqgCalculations.magicPointRecoveryPointsPerDay(18, undefined)).toBe(0);
  });
});

describe("magic point recovery time per point is correct for", () => {
  it("round POW at normal rate (exact whole hours)", () => {
    expect(RqgCalculations.magicPointRecoveryTimePerPoint(12, 1)).toStrictEqual({
      hours: 2,
      minutes: 0,
    });
  });

  it("POW with a minute remainder", () => {
    expect(RqgCalculations.magicPointRecoveryTimePerPoint(18, 1)).toStrictEqual({
      hours: 1,
      minutes: 20,
    });
  });

  it("fast enough recovery to be under an hour per point", () => {
    expect(RqgCalculations.magicPointRecoveryTimePerPoint(18, 2)).toStrictEqual({
      hours: 0,
      minutes: 40,
    });
  });

  it("no max magic points", () => {
    expect(RqgCalculations.magicPointRecoveryTimePerPoint(undefined, 1)).toStrictEqual({
      hours: 0,
      minutes: 0,
    });
  });

  it("zero rate factor", () => {
    expect(RqgCalculations.magicPointRecoveryTimePerPoint(18, 0)).toStrictEqual({
      hours: 0,
      minutes: 0,
    });
  });
});
