const { NumberField, SchemaField } = foundry.data.fields;

/**
 * Returns a SchemaField representing a Resource (value + max).
 * Use this for fields like `hitPoints`, `runePoints`, etc., where max is
 * user-configurable and persisted (weapons, cult rune points, hit locations).
 *
 * `nullableMax` allows `max` to be `null`, for the rare case where the resource genuinely doesn't
 * apply rather than just being "not yet set" - e.g. a natural/body-part weapon's hitPoints, which
 * has no independent max once `hitPointLocation` is set (see weapon-data-model.ts and #1012).
 * Leave it `false` (the default) for resources that always have a real max, like hit locations and
 * cult rune points.
 */
export function resourceSchemaField({ nullableMax = false }: { nullableMax?: boolean } = {}) {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    max: new NumberField({ integer: true, nullable: nullableMax, initial: 0 }),
  });
}

/**
 * Returns a SchemaField representing a Resource whose max is always derived
 * in prepareDerivedData() and must never be persisted.
 * Use this for character hitPoints; `magicPointsSchemaField` has the same value and max.
 */
export function derivedResourceSchemaField() {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    max: new NumberField({ integer: true, nullable: false, initial: 0, persisted: false }),
  });
}

/**
 * A character's magic points: the derived resource plus `baseMax`, a GM-set base for the maximum
 * that replaces POW when not null (creatures without POW, stat-block NPCs). Effects still add on
 * top of it.
 */
export function magicPointsSchemaField() {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    max: new NumberField({ integer: true, nullable: false, initial: 0, persisted: false }),
    baseMax: new NumberField({ integer: true, nullable: true, initial: null, min: 0 }),
  });
}
