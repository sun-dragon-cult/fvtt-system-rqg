import type { AttackDamages } from "./combatCalculations.types";

/**
 * calculations depending on attack-parry successLevels
 */
export const attackParryMap: Map<
  string,
  (damageRolled: number, parryingWeaponHp: number, attackingWeaponHp: number) => AttackDamages
> = new Map([
  ["0-0", critAttack_CritParry],
  ["0-1", critAttack_SpecialParry],
  ["0-2", critAttack_NormalParry],
  ["0-3", critAttack_FailParry],
  ["0-4", critAttack_FumbleParry],
  ["1-0", specialAttack_CritParry],
  ["1-1", specialAttack_SpecialParry],
  ["1-2", specialAttack_NormalParry],
  ["1-3", specialAttack_FailParry],
  ["1-4", specialAttack_FumbleParry],
  ["2-0", normalAttack_CritParry],
  ["2-1", normalAttack_SpecialParry],
  ["2-2", normalAttack_NormalParry],
  ["2-3", normalAttack_FailParry],
  ["2-4", normalAttack_FumbleParry],
  ["3-0", FailAttack_CritParry],
  ["3-1", FailAttack_SpecialParry],
  ["3-2", FailAttack_NormalParry],
  ["3-3", FailAttack_FailParry],
  ["3-4", FailAttack_FumbleParry],
  ["4-0", FumbleAttack_CritParry],
  ["4-1", FumbleAttack_SpecialParry],
  ["4-2", FumbleAttack_NormalParry],
  ["4-3", FumbleAttack_FailParry],
  ["4-4", FumbleAttack_FumbleParry],
]);

function critAttack_CritParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    affectParryingHitLocation: true,
  };
}

function critAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    affectParryingHitLocation: true,
  };
}

function critAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    affectParryingHitLocation: true,
  };
}

function critAttack_FailParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function critAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function specialAttack_CritParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function specialAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    affectParryingHitLocation: false,
  };
}

function specialAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon,
    defenderHitLocationDamage: damagePastParryWeapon,
    affectParryingHitLocation: false,
  };
}

function specialAttack_FailParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function specialAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function normalAttack_CritParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function normalAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function normalAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: damagePastParryWeapon,
    affectParryingHitLocation: true,
  };
}

function normalAttack_FailParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function normalAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function FailAttack_CritParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: damageRolled,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FailAttack_SpecialParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FailAttack_NormalParry(damageRolled: number, parryingWeaponHp: number): AttackDamages {
  const damagePastParryWeapon = Math.max(0, damageRolled - parryingWeaponHp);
  return {
    weaponDamage: damagePastParryWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}
function FailAttack_FailParry(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FailAttack_FumbleParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_CritParry(damageRolled: number): AttackDamages {
  return {
    weaponDamage: damageRolled,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_SpecialParry(
  damageRolled: number,
  parryingWeaponHp: number,
  attackingWeaponHp: number,
): AttackDamages {
  const damagePastAttackWeapon = Math.max(0, damageRolled - attackingWeaponHp);
  return {
    weaponDamage: damagePastAttackWeapon,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_NormalParry(
  damageRolled: number,
  parryingWeaponHp: number,
  attackingWeaponHp: number,
): AttackDamages {
  const damagePastAttackWeapon = Math.max(0, damageRolled - attackingWeaponHp);
  return {
    weaponDamage: damagePastAttackWeapon > 0 ? 1 : 0,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_FailParry(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_FumbleParry(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}
