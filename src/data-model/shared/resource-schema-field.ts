const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Returns a SchemaField representing a Resource (value + max).
 * Use this for fields like `hitPoints`, `runePoints`, etc.
 */
export function resourceSchemaField() {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    max: new NumberField({ integer: true, nullable: true, initial: undefined }),
  });
}
