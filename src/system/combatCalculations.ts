import type { AttackDamages, CombatOutcome } from "./combatCalculations.types";
import type { DefenceType } from "../chat/RqgChatMessage.types";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { assertItemType, localize, requireValue, RqgError } from "./util";
import { attackParryMap } from "./attackParryTable";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import type { RqgItem } from "../items/rqgItem";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import type { DamageType, UsageType } from "../data-model/item-data/weaponData";
import {
  DamageDegree,
  dodgeDamageDegreeTable,
  dodgeIgnoreApTable,
  parryDamageDegreeTable,
  parryDamagedWeaponTable,
  parryIgnoreApTable,
  WeaponDesignation,
  weaponForDamageTable,
} from "./combatCalculations.defs";
import { attackDodgeMap } from "./attackDodgeTable";

export const exportedForTesting = {
  calculateDamages,
  getDamagedWeapon,
};

/**
 * Provide a collected result of the outcome of a combat attack.
 */
export async function combatOutcome(
  defence: DefenceType | undefined,
  attackRoll: AbilityRoll,
  defenceRoll: AbilityRoll | undefined,
  attackingWeapon: RqgItem,
  attackWeaponUsageType: UsageType,
  attackDamageBonus: string,
  attackExtraDamage: string,
  defenceDamageBonus: string,
  parryingWeapon: RqgItem | undefined | null,
  parryWeaponUsageType: UsageType | undefined,
  damageType: DamageType,
): Promise<CombatOutcome> {
  const attackSuccessLevel = attackRoll.successLevel;
  requireValue(
    attackSuccessLevel,
    "Tried to calculate combat outcome without an evaluated attack roll",
  );
  const defenceSuccessLevel = defenceRoll?.successLevel ?? AbilitySuccessLevelEnum.Failure;
  const defenceUsed = defence ?? "ignore";

  const damageDegree = getDamageDegree(defenceUsed, attackSuccessLevel, defenceSuccessLevel);
  if (damageDegree === DamageDegree.None) {
    return createEmptyCombatOutcome();
  }

  const damagedWeaponDesignation = getDamagedWeapon(
    defence,
    attackSuccessLevel,
    defenceSuccessLevel,
  );
  const weaponDoingDamageDesignation: WeaponDesignation =
    getWeaponDoingDamage(defence, attackSuccessLevel, defenceSuccessLevel) ??
    WeaponDesignation.None;

  const weaponDoingDamage = getWeaponItemDoingDamage(
    weaponDoingDamageDesignation,
    attackingWeapon,
    parryingWeapon ?? undefined,
  );
  const usage = getWeaponDoingDamageUsage(
    weaponDoingDamageDesignation,
    attackWeaponUsageType,
    parryWeaponUsageType,
  );
  const damagedWeapon = getDamagedWeaponItem(
    damagedWeaponDesignation,
    attackingWeapon,
    parryingWeapon,
  );

  if (weaponDoingDamageDesignation === WeaponDesignation.None) {
    return createEmptyCombatOutcome();
  }
  requireValue(usage, "No weapon usage for combatOutcome calculations");
  assertItemType(weaponDoingDamage?.type, ItemTypeEnum.Weapon);

  const damageFormula = weaponDoingDamage?.getDamageFormula(usage, damageDegree, damageType);
  if (damageFormula == null) {
    requireValue(damageFormula, "Tried to calculate combat outcome without a damage formula");
  }
  const extraDamageFormula =
    weaponDoingDamageDesignation === "attackingWeapon"
      ? formatDamagePart(attackExtraDamage, "extra damage", "+") // TODO make extra damage text part of attack dialog
      : "";
  const damageFormulaWithExtraDamage = `${damageFormula}${extraDamageFormula}`;
  const damageBonus = weaponDoingDamage === parryingWeapon ? defenceDamageBonus : attackDamageBonus;
  const damageFormulaWithDb = applyDamageBonusToFormula(damageFormulaWithExtraDamage, damageBonus);

  const damageRoll = await evaluateDamageRoll(damageFormulaWithDb, damageDegree);

  const { weaponDamage, defenderHitLocationDamage, affectParryingHitLocation } = calculateDamages(
    defence,
    damageRoll.total,
    attackSuccessLevel,
    defenceSuccessLevel,
    parryingWeapon?.system.hitPoints.value,
    attackingWeapon?.system.hitPoints.value,
  );

  return {
    damageRoll,
    weaponDamage,
    damagedWeapon,
    defenderHitLocationDamage,
    useParryHitLocation: affectParryingHitLocation,
    ignoreDefenderAp: getIgnoreArmor(defence, attackSuccessLevel, defenceSuccessLevel),
    weaponDoingDamage: weaponDoingDamageDesignation,
  };
}
/**
 * Format a damage part of a damage formula with a description in brackets.
 * The description is localized.
 * The prefixOperator is added before the damage formula if supplied.
 */
export function formatDamagePart(
  damageFormula: string, // Can also be a db placeholder like "+db"
  description: string,
  prefixOperator: string = "",
): string {
  if (!damageFormula.trim()) {
    return ""; // 0 or empty string does not add the description
  }

  const compoundFormulaRegex = new RegExp("(?<!^)[+-]"); // contains + or - but ignore the first character to not match "+db"
  const isCompoundFormula = compoundFormulaRegex.test(damageFormula);
  const translatedDescription = localize(description);

  if (isCompoundFormula) {
    return `${prefixOperator}(${damageFormula})[${translatedDescription}]`;
  } else {
    return `${prefixOperator}${damageFormula}[${translatedDescription}]`;
  }
}

// *** Helper functions ***
function getWeaponItemDoingDamage(
  designation: WeaponDesignation,
  attackingWeapon: RqgItem,
  parryingWeapon: RqgItem | undefined,
): RqgItem | undefined {
  const weaponItemMap = new Map<WeaponDesignation, RqgItem | undefined>([
    [WeaponDesignation.None, undefined],
    [WeaponDesignation.AttackingWeapon, attackingWeapon],
    [WeaponDesignation.ParryWeapon, parryingWeapon ?? undefined],
  ]);
  return designation === WeaponDesignation.None ? undefined : weaponItemMap.get(designation);
}

function getWeaponDoingDamageUsage(
  designation: WeaponDesignation,
  attackWeaponUsageType: UsageType,
  parryWeaponUsageType: UsageType | undefined,
): UsageType | undefined {
  return designation === WeaponDesignation.AttackingWeapon
    ? attackWeaponUsageType
    : parryWeaponUsageType;
}

function getDamagedWeaponItem(
  designation: WeaponDesignation,
  attackingWeapon: RqgItem,
  parryingWeapon: RqgItem | undefined | null,
): RqgItem | undefined {
  return designation === WeaponDesignation.None
    ? undefined
    : designation === WeaponDesignation.AttackingWeapon
      ? attackingWeapon
      : (parryingWeapon ?? undefined);
}

function createEmptyCombatOutcome(): CombatOutcome {
  return {
    damageRoll: undefined,
    weaponDamage: undefined,
    damagedWeapon: undefined,
    defenderHitLocationDamage: undefined,
    useParryHitLocation: false,
    ignoreDefenderAp: false,
    weaponDoingDamage: WeaponDesignation.None,
  };
}

// TODO maximize maybe not needed if item getDamageFormula replaces maxSpecial with numbers?
async function evaluateDamageRoll(
  damageFormula: string,
  damageDegree: DamageDegree,
): Promise<Roll> {
  const damageRoll = new Roll(damageFormula);
  try {
    await damageRoll.evaluate({ maximize: damageDegree === "maxSpecial" });
    requireValue(damageRoll.total, "damage roll was not yet evaluated?");
  } catch (e) {
    ui.notifications?.error(`Failed to evaluate damage roll: ${damageFormula}`);
    console.warn("Failed to evaluate damage roll", e);
  }

  return damageRoll;
}

function calculateDamages(
  defence: DefenceType | undefined,
  damageRolled: number | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
  parryingWeaponHp: number | undefined,
  attackingWeaponHp: number | undefined,
): AttackDamages {
  requireValue(damageRolled, "Tried to calculate damages without a rolled damage");

  switch (defence) {
    case "parry":
      return calculateParryDamages(
        attackSuccessLevel,
        defenceSuccessLevel,
        damageRolled,
        parryingWeaponHp ?? 0,
        attackingWeaponHp ?? 0,
      );

    case "dodge":
      return calculateDodgeDamages(attackSuccessLevel, defenceSuccessLevel, damageRolled);

    case "ignore":
    default:
      return calculateDodgeDamages(
        attackSuccessLevel,
        AbilitySuccessLevelEnum.Failure,
        damageRolled,
      );
  }
}

function getIgnoreArmor(
  defence: DefenceType | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum,
): boolean {
  const errorMsg = "Tried to get if armor should be ignored for unsupported AbilitySuccessLevel";

  switch (defence) {
    case "parry": {
      const damageDegree = parryIgnoreApTable[attackSuccessLevel][defenceSuccessLevel];
      requireValue(damageDegree, errorMsg);
      return damageDegree;
    }

    case "dodge":
    case "ignore": {
      const damageDegree = dodgeIgnoreApTable[attackSuccessLevel][defenceSuccessLevel];
      requireValue(damageDegree, errorMsg);
      return damageDegree;
    }

    default:
      throw new RqgError("Tried to get damage degree for invalid defence");
  }
}

/**
 * Calculate what weapon should get damage. Attacking Weapon, Defending Weapon or no weapon.
 */
function getDamagedWeapon(
  defence: DefenceType | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum,
): WeaponDesignation {
  if (defence === "dodge" || defence === "ignore") {
    return WeaponDesignation.None;
  }

  const damageDegree = parryDamagedWeaponTable[attackSuccessLevel][defenceSuccessLevel];
  requireValue(damageDegree, "Tried to get damaged weapon for unsupported AbilitySuccessLevel");
  return damageDegree;
}

function getWeaponDoingDamage(
  defence: DefenceType | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum,
): WeaponDesignation | undefined {
  if ([undefined, "dodge", "ignore"].includes(defence)) {
    return WeaponDesignation.AttackingWeapon;
  }
  return weaponForDamageTable[attackSuccessLevel][defenceSuccessLevel];
}

export function getDamageDegree(
  defence: DefenceType,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum,
): DamageDegree {
  const errorMsg = "Tried to get damage degree for unsupported AbilitySuccessLevel";

  switch (defence) {
    case "parry": {
      const damageDegree = parryDamageDegreeTable[attackSuccessLevel][defenceSuccessLevel];
      requireValue(damageDegree, errorMsg);
      return damageDegree;
    }

    case "dodge":
    case "ignore": {
      const damageDegree = dodgeDamageDegreeTable[attackSuccessLevel][defenceSuccessLevel];
      requireValue(damageDegree, errorMsg);
      return damageDegree;
    }

    default:
      throw new RqgError("Tried to get damage degree for invalid defence");
  }
}

/**
 * Evaluate results from the "Attack & Parry Results" table

 * @param attackSuccessLevel
 * @param defenceSuccessLevel
 * @param damageRolled This can be the attacking weapon or the defending weapon damage
 * @param parryingWeaponHp
 * @param attackingWeaponHp
 */
function calculateParryDamages(
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
  damageRolled: number,
  parryingWeaponHp: number,
  attackingWeaponHp: number,
): AttackDamages {
  if (defenceSuccessLevel == null) {
    const msg = "Tried to calculate parry outcome without parry success level";
    throw new RqgError(msg, attackSuccessLevel);
  }
  const damageOutcomeFn = attackParryMap.get(`${attackSuccessLevel}-${defenceSuccessLevel}`);
  if (!damageOutcomeFn) {
    throw new RqgError("Didn't find a damage calculating function from attack/parry table");
  }

  return damageOutcomeFn(damageRolled, parryingWeaponHp, attackingWeaponHp);
}

/**
 * Evaluate results from the "Dodge Results" table
 **/
function calculateDodgeDamages(
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
  damageRolled: number,
): AttackDamages {
  if (defenceSuccessLevel == null) {
    const msg = "Tried to calculate dodge outcome without dodge success level";
    throw new RqgError(msg, attackSuccessLevel);
  }
  const damageOutcomeFn = attackDodgeMap.get(`${attackSuccessLevel}-${defenceSuccessLevel}`);
  if (!damageOutcomeFn) {
    throw new RqgError("Didn't find a damage calculating function from attack/dodge table");
  }

  return damageOutcomeFn(damageRolled);
}

/**
 * If the damageFormula contains db or db/2 then apply the damageBonus die string instead of that placeholder.
 * If db/2 is specified in damageFormula, reduce the damageBonus formula by half.
 */
function applyDamageBonusToFormula(damageFormula: string, damageBonus: string) {
  // Do not add damage bonus if it's 0
  if (!damageBonus || damageBonus === "0") {
    return damageFormula.replace(/\s*\+\s*db(\/2)?/g, "");
  }

  // Calculate half damage bonus
  if (damageFormula.includes("db/2")) {
    let oddDie = "";
    let [dice, sides] = damageBonus
      .toLowerCase()
      .trim()
      .split("d")
      .map((n) => Number(n));
    if (dice === 1) {
      sides = sides / 2;
    } else {
      dice = Math.floor(dice / 2);
      if (dice % 2 !== 0) {
        // In case the number of die is not even, add another halved die. half 3d6 => 1d6+1d3
        // Assumes sides is an even number, won't work for 1d3, but that is not used as DB in RQG
        oddDie = `+1d${sides / 2}`;
      }
    }

    return damageFormula.replaceAll(
      "db/2",
      formatDamagePart(`${dice}d${sides}${oddDie}`, "RQG.Roll.DamageRoll.DamageBonus"),
    );
  } else {
    // Add full damage bonus
    return damageFormula.replaceAll(
      "db",
      formatDamagePart(damageBonus, "RQG.Roll.DamageRoll.DamageBonus"),
    );
  }
}
