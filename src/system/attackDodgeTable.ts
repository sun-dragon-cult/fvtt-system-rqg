import type { AttackDamages } from "./combatCalculations.types";

/**
 * calculations depending on attack-dodge successLevels
 */
export const attackDodgeMap: Map<string, (damageRolled: number) => AttackDamages> = new Map([
  ["0-0", critAttack_CritDodge],
  ["0-1", critAttack_SpecialDodge],
  ["0-2", critAttack_NormalDodge],
  ["0-3", critAttack_FailDodge],
  ["0-4", critAttack_FumbleDodge],
  ["1-0", specialAttack_CritDodge],
  ["1-1", specialAttack_SpecialDodge],
  ["1-2", specialAttack_NormalDodge],
  ["1-3", specialAttack_FailDodge],
  ["1-4", specialAttack_FumbleDodge],
  ["2-0", normalAttack_CritDodge],
  ["2-1", normalAttack_SpecialDodge],
  ["2-2", normalAttack_NormalDodge],
  ["2-3", normalAttack_FailDodge],
  ["2-4", normalAttack_FumbleDodge],
  ["3-0", FailAttack_CritDodge],
  ["3-1", FailAttack_SpecialDodge],
  ["3-2", FailAttack_NormalDodge],
  ["3-3", FailAttack_FailDodge],
  ["3-4", FailAttack_FumbleDodge],
  ["4-0", FumbleAttack_CritDodge],
  ["4-1", FumbleAttack_SpecialDodge],
  ["4-2", FumbleAttack_NormalDodge],
  ["4-3", FumbleAttack_FailDodge],
  ["4-4", FumbleAttack_FumbleDodge],
]);

function critAttack_CritDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function critAttack_SpecialDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function critAttack_NormalDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function critAttack_FailDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function critAttack_FumbleDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function specialAttack_CritDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function specialAttack_SpecialDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function specialAttack_NormalDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function specialAttack_FailDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function specialAttack_FumbleDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function normalAttack_CritDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function normalAttack_SpecialDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function normalAttack_NormalDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function normalAttack_FailDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function normalAttack_FumbleDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function FailAttack_CritDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FailAttack_SpecialDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FailAttack_NormalDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}
function FailAttack_FailDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FailAttack_FumbleDodge(damageRolled: number): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: damageRolled,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_CritDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_SpecialDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_NormalDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_FailDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}

function FumbleAttack_FumbleDodge(): AttackDamages {
  return {
    weaponDamage: undefined,
    defenderHitLocationDamage: undefined,
    affectParryingHitLocation: false,
  };
}
