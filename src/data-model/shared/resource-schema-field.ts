const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Returns a SchemaField representing a Resource (value + max).
 * Use this for fields like `hitPoints`, `runePoints`, etc., where max is
 * user-configurable and persisted (weapons, cult rune points, hit locations).
 */
export function resourceSchemaField() {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    max: new NumberField({ integer: true, nullable: false, initial: 0 }),
  });
}

/**
 * Returns a SchemaField representing a Resource whose max is always derived
 * in prepareDerivedData() and must never be persisted.
 * Use this for character hitPoints and magicPoints.
 */
export function derivedResourceSchemaField() {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    max: new NumberField({ integer: true, nullable: false, initial: 0, persisted: false }),
  });
}
