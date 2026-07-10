/**
 * Pure enum/const definitions for weapon-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const damageType = {
  Crush: "crush",
  Slash: "slash",
  Impale: "impale",
  Parry: "parry",
  Special: "special",
} as const;
export type DamageType = (typeof damageType)[keyof typeof damageType];

export const combatManeuverNames = [
  "Throw",
  "Shoot",
  "Thrust",
  "Cut",
  "Bash",
  "HeadButt",
  "Hit",
  "Parry",
  "Grapple",
  "Knockback",
  // Natural weapon maneuvers
  "Bite",
  "Claw",
  "Gore",
  "Hug",
  "Kick",
  "Punch",
  "Trample",
] as const;
export type CombatManeuverName = (typeof combatManeuverNames)[number];
