const { BooleanField, NumberField } = foundry.data.fields;

/**
 * Returns the Foundry data field definitions shared by all ability item types
 * (skill, rune, passion). Mirrors the IAbility interface.
 */
export function abilitySchemaFields() {
  return {
    canGetExperience: new BooleanField({ nullable: false, initial: true }),
    hasExperience: new BooleanField({ nullable: false, initial: false }),
    chance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
  } as const;
}
