import Item = foundry.documents.Item;

function defaultNumber(field: foundry.data.fields.NumberField): number | null {
  return field.options.nullable ? null : Number(field.options.initial) || 0;
}

function coerceNumber(value: string, field: foundry.data.fields.NumberField): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined") {
    return defaultNumber(field);
  }
  const normalized = trimmed.replace(",", ".");
  const num = Number(normalized);
  if (Number.isNaN(num)) {
    return defaultNumber(field);
  }
  return field.options.integer ? Math.round(num) : num;
}

/**
 * Recursively coerce string values to numbers where the schema expects a NumberField.
 * This handles legacy data that was stored as strings (e.g. from form inputs).
 */
function coerceNumbers(
  data: Record<string, unknown>,
  schema: foundry.data.fields.DataSchema,
): void {
  for (const [key, field] of Object.entries(schema)) {
    if (!(key in data)) {
      continue;
    }
    const value = data[key];

    if (field instanceof foundry.data.fields.NumberField) {
      if (typeof value === "string") {
        data[key] = coerceNumber(value, field);
      } else if (value === null && !field.options.nullable) {
        data[key] = defaultNumber(field);
      }
    } else if (field instanceof foundry.data.fields.ArrayField && Array.isArray(value)) {
      if (field.element instanceof foundry.data.fields.NumberField) {
        const numField = field.element;
        data[key] = (value as unknown[]).map((v) => {
          if (typeof v === "string") {
            return coerceNumber(v, numField);
          }
          if (v === null && !numField.options.nullable) {
            return defaultNumber(numField);
          }
          return v;
        });
      } else if (field.element instanceof foundry.data.fields.SchemaField) {
        for (const entry of value as Record<string, unknown>[]) {
          if (entry && typeof entry === "object") {
            coerceNumbers(entry, field.element.fields as foundry.data.fields.DataSchema);
          }
        }
      }
    } else if (
      field instanceof foundry.data.fields.SchemaField &&
      value &&
      typeof value === "object"
    ) {
      coerceNumbers(
        value as Record<string, unknown>,
        field.fields as foundry.data.fields.DataSchema,
      );
    }
  }
}

/**
 * Base DataModel class for all RQG item types.
 * Extend this instead of `foundry.abstract.TypeDataModel` directly.
 */
export abstract class RqgItemDataModel<
  Schema extends foundry.data.fields.DataSchema,
  DerivedData extends Record<string, unknown> = Record<string, never>,
> extends foundry.abstract.TypeDataModel<
  Schema,
  Item.Implementation,
  Record<string, never>,
  DerivedData
> {
  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    const schema = this.defineSchema();
    coerceNumbers(source, schema);
    return super.migrateData(source);
  }
}
