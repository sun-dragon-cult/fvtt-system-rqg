import type {
  AttackDamages,
  CombatOutcome,
  DamageDegree,
  DamagedWeapon,
} from "./combatCalculations.types";
import type { DefenceType } from "../chat/RqgChatMessage.types";
import { AbilitySuccessLevelEnum } from "../rolls/AbilityRoll/AbilityRoll.defs";
import { assertItemType, requireValue, RqgError } from "./util";
import { attackParryMap } from "./attackParryTable";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import type { RqgItem } from "../items/rqgItem";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { UsageType } from "../data-model/item-data/weaponData";
import {
  dodgeDamageDegreeTable,
  dodgeIgnoreApTable,
  parryDamageDegreeTable,
  parryDamagedWeaponTable,
  parryIgnoreApTable,
} from "./combatCalculations.defs";

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
  parryingWeapon: RqgItem | undefined | null,
  parryWeaponUsageType: UsageType | undefined,
): Promise<CombatOutcome> {
  if (!attackRoll.successLevel) {
    const msg = "Tried to calculate combat outcome without an evaluated attack roll";
    throw new RqgError(msg, defence, attackRoll, defenceRoll, parryingWeapon);
  }
  const attackSuccessLevel = attackRoll.successLevel;
  const defenceSuccessLevel = defenceRoll?.successLevel ?? AbilitySuccessLevelEnum.Failure; // TODO is fail correct here?
  const defenceUsed = defence ?? "ignore";

  const damagedDegree = getDamageDegree(defenceUsed, attackSuccessLevel, defenceSuccessLevel);

  const damagedWeaponDesignation = getDamagedWeapon(
    defence,
    attackSuccessLevel,
    defenceSuccessLevel,
  );

  const weaponForDamage =
    damagedWeaponDesignation === "parryWeapon" ? parryingWeapon : attackingWeapon;
  const usage =
    damagedWeaponDesignation === "parryWeapon" ? parryWeaponUsageType : attackWeaponUsageType;

  const damagedWeapon =
    damagedWeaponDesignation === "attackingWeapon"
      ? attackingWeapon
      : (parryingWeapon ?? undefined);

  if (damagedWeaponDesignation !== "none") {
    requireValue(usage, "No weapon usage for combatOutcome calculations");
    assertItemType(weaponForDamage?.type, ItemTypeEnum.Weapon);
  }

  const damageFormula = weaponForDamage?.getDamageFormula(usage, damagedDegree);
  if (!damageFormula) {
    return {
      weaponDamage: undefined,
      damagedWeapon: undefined,
      defenderHitLocationDamage: undefined,
      useParryHitLocation: false,
      ignoreDefenderAp: false,
    };
  }

  const damageFormulaWithDb = damageFormula.replaceAll("db", attackDamageBonus);

  const damageRoll = new Roll(damageFormulaWithDb);
  await damageRoll.evaluate({
    maximize: damagedDegree === "maxSpecial",
  });
  requireValue(damageRoll.total, "damage roll was not yet evaluated?");

  const { weaponDamage, defenderHitLocationDamage, parryingHitLocation } = calculateDamages(
    defence,
    damageRoll.total,
    attackSuccessLevel,
    defenceSuccessLevel,
    parryingWeapon?.system.hitPoints.value,
    attackingWeapon?.system.hitPoints.value,
  );

  return {
    weaponDamage: weaponDamage,
    damagedWeapon: damagedWeapon,
    defenderHitLocationDamage: defenderHitLocationDamage,
    useParryHitLocation: parryingHitLocation,
    ignoreDefenderAp: getIgnoreArmor(defence, attackSuccessLevel, defenceSuccessLevel),
  };
}

function calculateDamages(
  defence: DefenceType | undefined,
  damageRolled: number,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum | undefined,
  parryingWeaponHp: number | undefined,
  attackingWeaponHp: number | undefined,
): AttackDamages {
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

function getDamagedWeapon(
  defence: DefenceType | undefined,
  attackSuccessLevel: AbilitySuccessLevelEnum,
  defenceSuccessLevel: AbilitySuccessLevelEnum,
): DamagedWeapon {
  if (defence === "dodge") {
    return "none";
  }

  const damageDegree = parryDamagedWeaponTable[attackSuccessLevel][defenceSuccessLevel];
  requireValue(damageDegree, "Tried to get damaged weapon for unsupported AbilitySuccessLevel");
  return damageDegree;
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
  if (!defenceSuccessLevel) {
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
  if (!defenceSuccessLevel) {
    const msg = "Tried to calculate dodge outcome without dodge success level";
    throw new RqgError(msg, attackSuccessLevel);
  }

  // TODO implement dodge table

  return {
    // TODO fallback for testing - should be error
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    parryingHitLocation: false,
  };
}
