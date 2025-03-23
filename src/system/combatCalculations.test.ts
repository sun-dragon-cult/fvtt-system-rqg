import {
  __setLocalizeFunction,
  exportedForTesting,
  getDamageDegree,
  getMasterOpponentModifier,
} from "./combatCalculations";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { RqgError } from "./util";
import { WeaponDesignation } from "./combatCalculations.defs";

describe("getDamageDegree", () => {
  it("should return the correct damage degree for parry", () => {
    const result = getDamageDegree(
      "parry",
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Failure,
    );
    expect(result).toBe("normal");
  });

  it("should return the correct damage degree for dodge", () => {
    const result = getDamageDegree(
      "dodge",
      AbilitySuccessLevelEnum.Special,
      AbilitySuccessLevelEnum.Failure,
    );
    expect(result).toBe("special");
  });

  it("should return the correct damage degree for ignore", () => {
    const result = getDamageDegree(
      "ignore",
      AbilitySuccessLevelEnum.Critical,
      AbilitySuccessLevelEnum.Failure,
    );
    expect(result).toBe("maxSpecial");
  });

  it("should throw an error for unsupported defence type", () => {
    expect(() =>
      getDamageDegree(
        "unsupported" as any,
        AbilitySuccessLevelEnum.Success,
        AbilitySuccessLevelEnum.Failure,
      ),
    ).toThrow(RqgError);
  });
});

const calculateDamages = exportedForTesting.calculateDamages;

describe("calculateDamages", () => {
  it("should return correct damage for Success:Success attack and parry", () => {
    const result = calculateDamages(
      "parry",
      10,
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Success,
      5,
      5,
    );
    expect(result).toEqual({
      weaponDamage: 1,
      defenderHitLocationDamage: 5,
      affectParryingHitLocation: true,
    });
  });

  it("should return correct damage for Success:Failure attack and parry", () => {
    const result = calculateDamages(
      "parry",
      20,
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Failure,
      10,
      4,
    );
    expect(result).toEqual({
      weaponDamage: undefined,
      defenderHitLocationDamage: 20,
      affectParryingHitLocation: false,
    });
  });

  it("should return correct damage for Crit:Special attack and parry", () => {
    const result = calculateDamages(
      "parry",
      50,
      AbilitySuccessLevelEnum.Critical,
      AbilitySuccessLevelEnum.Special,
      4,
      12,
    );
    expect(result).toEqual({
      weaponDamage: 1,
      defenderHitLocationDamage: 46,
      affectParryingHitLocation: true,
    });
  });

  it("should return correct damage for Failure:Success attack and parry", () => {
    const result = calculateDamages(
      "parry",
      20,
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Failure,
      10,
      4,
    );
    expect(result).toEqual({
      weaponDamage: undefined,
      defenderHitLocationDamage: 20,
      affectParryingHitLocation: false,
    });
  });

  it("should return correct damage for Success:Success attack and dodge", () => {
    const result = calculateDamages(
      "dodge",
      10,
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Success,
      undefined,
      undefined,
    );
    expect(result).toEqual({
      weaponDamage: undefined,
      defenderHitLocationDamage: undefined,
      affectParryingHitLocation: false,
    });
  });

  it("should return correct damage for Success:Failure attack and dodge", () => {
    const result = calculateDamages(
      "dodge",
      10,
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Failure,
      undefined,
      undefined,
    );
    expect(result).toEqual({
      weaponDamage: undefined,
      defenderHitLocationDamage: 10,
      affectParryingHitLocation: false,
    });
  });

  it("should return correct damage for ignore defense", () => {
    const result = calculateDamages(
      "ignore",
      10,
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Failure,
      undefined,
      undefined,
    );
    expect(result).toEqual({
      weaponDamage: undefined,
      defenderHitLocationDamage: 10,
      affectParryingHitLocation: false,
    });
  });

  it("should throw an error if defence success level is undefined for parry", () => {
    expect(() =>
      calculateDamages("parry", 10, AbilitySuccessLevelEnum.Success, undefined, 5, 5),
    ).toThrow(RqgError);
  });

  it("should throw an error if no damage calculating function is found for parry", () => {
    expect(() =>
      calculateDamages("parry", 10, "unsupported" as any, AbilitySuccessLevelEnum.Success, 5, 5),
    ).toThrow(RqgError);
  });
});

const getDamagedWeapon = exportedForTesting.getDamagedWeapon;

describe("getDamagedWeapon", () => {
  it("should return 'none' for dodge defense", () => {
    const result = getDamagedWeapon(
      "dodge",
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Success,
    );
    expect(result).toBe("none");
  });

  it("should return 'parryWeapon' for parry defense with Success:Success", () => {
    const result = getDamagedWeapon(
      "parry",
      AbilitySuccessLevelEnum.Success,
      AbilitySuccessLevelEnum.Success,
    );
    expect(result).toBe("parryWeapon");
  });

  it("should return 'none' for parry defense with Crit:Failure", () => {
    const result = getDamagedWeapon(
      "parry",
      AbilitySuccessLevelEnum.Critical,
      AbilitySuccessLevelEnum.Failure,
    );
    expect(result).toBe("none");
  });
});

const applyDamageBonusToFormula = exportedForTesting.applyDamageBonusToFormula;

describe("applyDamageBonusToFormula", () => {
  const mockLocalize = jest.fn((key) => key);
  __setLocalizeFunction(mockLocalize);

  it("should return the formula without db if damageBonus is 0", () => {
    const result = applyDamageBonusToFormula("1d6 + db", "0");
    expect(result).toBe("1d6");
  });

  it("should replace db with 2d6 damageBonus", () => {
    const result = applyDamageBonusToFormula("1d6 + db", "2d6");
    expect(result).toBe("1d6 + 2d6[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should replace db/2 with half 2d6 damageBonus", () => {
    const result = applyDamageBonusToFormula("1d6 + db/2", "2d6");
    expect(result).toBe("1d6 + 1d6[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should replace db/2 with half 1d4 damageBonus v2", () => {
    const result = applyDamageBonusToFormula("1d6 + db/2", "1d4");
    expect(result).toBe("1d6 + 1d2[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should handle odd dice numbers for db/2 with db 3d6", () => {
    const result = applyDamageBonusToFormula("1d6 + db/2", "3d6");
    expect(result).toBe("1d6 + (1d6+1d3)[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should replace db/2 with half of 5d6", () => {
    const result = applyDamageBonusToFormula("1d6 + db/2", "5d6");
    expect(result).toBe("1d6 + (2d6+1d3)[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should handle db/2 with negative db of -1d4", () => {
    const result = applyDamageBonusToFormula("1d6 + db/2", "-1d4");
    expect(result).toBe("1d6 + -1d2[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should remove db if damageBonus is empty", () => {
    const result = applyDamageBonusToFormula("1d6 + db", "");
    expect(result).toBe("1d6");
  });

  it("should handle complex formulas with db", () => {
    const result = applyDamageBonusToFormula("1d6 + 2d4 + db", "1d8");
    expect(result).toBe("1d6 + 2d4 + 1d8[RQG.Roll.DamageRoll.DamageBonus]");
  });

  it("should handle complex formulas with db/2", () => {
    const result = applyDamageBonusToFormula("1d6 + 2d4 + db/2", "1d8");
    expect(result).toBe("1d6 + 2d4 + 1d4[RQG.Roll.DamageRoll.DamageBonus]");
  });
});

describe("getMasterOpponentModifier", () => {
  it("should return a modifier of 0 and WeaponDesignation.None when both chances are 100", () => {
    const result = getMasterOpponentModifier(100, 100);
    expect(result).toEqual({ modifier: 0, modifiedWeapon: WeaponDesignation.None });
  });

  it("should return a modifier of 0 and WeaponDesignation.None when both chances are equal above 100", () => {
    const result = getMasterOpponentModifier(150, 150);
    expect(result).toEqual({ modifier: 0, modifiedWeapon: WeaponDesignation.None });
  });

  it("should return a positive modifier and WeaponDesignation.ParryWeapon when attack chance is greater than defence chance", () => {
    const result = getMasterOpponentModifier(150, 100);
    expect(result).toEqual({ modifier: -50, modifiedWeapon: WeaponDesignation.ParryWeapon });
  });

  it("should return a negative modifier and WeaponDesignation.AttackingWeapon when defence chance is greater than attack chance", () => {
    const result = getMasterOpponentModifier(100, 150);
    expect(result).toEqual({ modifier: -50, modifiedWeapon: WeaponDesignation.AttackingWeapon });
  });

  it("should return a modifier of 0 and WeaponDesignation.None when both chances are less than 100", () => {
    const result = getMasterOpponentModifier(50, 50);
    expect(result).toEqual({ modifier: 0, modifiedWeapon: WeaponDesignation.None });
  });

  it("should handle cases where attack chance is over 100 and defence chance is less than 100", () => {
    const result = getMasterOpponentModifier(150, 50);
    expect(result).toEqual({ modifier: -50, modifiedWeapon: WeaponDesignation.ParryWeapon });
  });

  it("should handle cases where defence chance is over 100 and attack chance is less than 100", () => {
    const result = getMasterOpponentModifier(50, 150);
    expect(result).toEqual({ modifier: -50, modifiedWeapon: WeaponDesignation.AttackingWeapon });
  });

  it("should handle cases where the attack chance is over 100 and the defence chance is lower, but over 100", () => {
    const result = getMasterOpponentModifier(150, 130);
    expect(result).toEqual({ modifier: -50, modifiedWeapon: WeaponDesignation.ParryWeapon });
  });

  it("should handle cases where the attack chance is over 100 and the defence chance is higher, and over 100", () => {
    const result = getMasterOpponentModifier(110, 140);
    expect(result).toEqual({ modifier: -40, modifiedWeapon: WeaponDesignation.AttackingWeapon });
  });
});
