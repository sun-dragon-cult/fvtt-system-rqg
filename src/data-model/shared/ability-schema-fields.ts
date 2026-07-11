const { BooleanField, NumberField } = foundry.data.fields;

/**
 * Returns the Foundry data field definitions shared by all ability item types
 * (skill, rune, passion). Mirrors the IAbility interface, excluding `chance`
 * since only rune and passion persist that field (skill derives it at runtime
 * from `baseChance` + `gainedChance`, see skill-lifecycle.ts).
 */
export function abilitySchemaFields() {
  return {
    canGetExperience: new BooleanField({ nullable: false, initial: true }),
    hasExperience: new BooleanField({ nullable: false, initial: false }),
  } as const;
}

/**
 * Returns the persisted `chance` field definition. Only rune and passion items
 * store their effective chance directly; skill's effective chance is purely
 * derived (see skill-lifecycle.ts) and must not spread this into its schema.
 */
export function persistedChanceSchemaField() {
  return {
    chance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
  } as const;
}
