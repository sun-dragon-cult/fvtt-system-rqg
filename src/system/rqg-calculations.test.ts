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

describe("magic point recovery catch-up is correct for", () => {
  // 18 max MP at normal rate = 1 point every 80 minutes (4800 seconds), per the time-per-point tests above.
  const minutesPerPoint = 80;
  const secondsPerPoint = minutesPerPoint * 60;

  it("never-settled (null) checkpoint seeds to now and recovers nothing", () => {
    expect(RqgCalculations.magicPointRecoveryCatchUp(null, 99_999, 18, 1)).toStrictEqual({
      pointsRecovered: 0,
      newSettledWorldTime: 99_999,
    });
  });

  it("no time elapsed recovers nothing and leaves the checkpoint in place", () => {
    expect(RqgCalculations.magicPointRecoveryCatchUp(1000, 1000, 18, 1)).toStrictEqual({
      pointsRecovered: 0,
      newSettledWorldTime: 1000,
    });
  });

  it("elapsed time short of one point recovers nothing and doesn't consume the checkpoint", () => {
    expect(RqgCalculations.magicPointRecoveryCatchUp(0, secondsPerPoint - 60, 18, 1)).toStrictEqual(
      {
        pointsRecovered: 0,
        newSettledWorldTime: 0,
      },
    );
  });

  it("exactly one point's worth of elapsed time", () => {
    expect(RqgCalculations.magicPointRecoveryCatchUp(0, secondsPerPoint, 18, 1)).toStrictEqual({
      pointsRecovered: 1,
      newSettledWorldTime: secondsPerPoint,
    });
  });

  it("multiple whole points", () => {
    expect(RqgCalculations.magicPointRecoveryCatchUp(0, secondsPerPoint * 3, 18, 1)).toStrictEqual({
      pointsRecovered: 3,
      newSettledWorldTime: secondsPerPoint * 3,
    });
  });

  it("carries a leftover partial-point remainder forward instead of discarding it", () => {
    const current = secondsPerPoint + 40 * 60; // one full point plus 40 extra minutes
    expect(RqgCalculations.magicPointRecoveryCatchUp(0, current, 18, 1)).toStrictEqual({
      pointsRecovered: 1,
      newSettledWorldTime: secondsPerPoint, // the 40 leftover minutes stay uncommitted
    });
  });

  it("zero rate factor recovers nothing and leaves the checkpoint in place", () => {
    expect(RqgCalculations.magicPointRecoveryCatchUp(0, secondsPerPoint * 3, 18, 0)).toStrictEqual({
      pointsRecovered: 0,
      newSettledWorldTime: 0,
    });
  });

  it("no max magic points recovers nothing", () => {
    expect(
      RqgCalculations.magicPointRecoveryCatchUp(0, secondsPerPoint * 3, undefined, 1),
    ).toStrictEqual({
      pointsRecovered: 0,
      newSettledWorldTime: 0,
    });
  });
});

describe("natural healing weeks elapsed is correct for", () => {
  const secondsPerWeek = 7 * 24 * 60 * 60;

  it("never-settled (null) checkpoint seeds to now and heals nothing", () => {
    expect(RqgCalculations.healingWeeksElapsed(null, 99_999)).toStrictEqual({
      weeksElapsed: 0,
      newSettledWorldTime: 99_999,
    });
  });

  it("no time elapsed heals nothing and leaves the checkpoint in place", () => {
    expect(RqgCalculations.healingWeeksElapsed(1000, 1000)).toStrictEqual({
      weeksElapsed: 0,
      newSettledWorldTime: 1000,
    });
  });

  it("elapsed time short of one week heals nothing and doesn't consume the checkpoint", () => {
    expect(RqgCalculations.healingWeeksElapsed(0, secondsPerWeek - 60)).toStrictEqual({
      weeksElapsed: 0,
      newSettledWorldTime: 0,
    });
  });

  it("exactly one week's worth of elapsed time", () => {
    expect(RqgCalculations.healingWeeksElapsed(0, secondsPerWeek)).toStrictEqual({
      weeksElapsed: 1,
      newSettledWorldTime: secondsPerWeek,
    });
  });

  it("multiple whole weeks", () => {
    expect(RqgCalculations.healingWeeksElapsed(0, secondsPerWeek * 3)).toStrictEqual({
      weeksElapsed: 3,
      newSettledWorldTime: secondsPerWeek * 3,
    });
  });

  it("carries a leftover partial-week remainder forward instead of discarding it", () => {
    const current = secondsPerWeek + 2 * 24 * 60 * 60; // one full week plus 2 extra days
    expect(RqgCalculations.healingWeeksElapsed(0, current)).toStrictEqual({
      weeksElapsed: 1,
      newSettledWorldTime: secondsPerWeek, // the 2 leftover days stay uncommitted
    });
  });
});
