/**
 * Converts a Foundry `DataSchema` field tree (as returned by a DataModel's
 * `defineSchema()`, built with the shim classes from `./foundry-schema-shim.ts`)
 * into a plain JSON Schema (draft 2020-12) node.
 */
import {
  ArrayFieldShim,
  BooleanFieldShim,
  DocumentUUIDFieldShim,
  NumberFieldShim,
  ObjectFieldShim,
  SchemaFieldShim,
  StringFieldShim,
} from "./foundry-schema-shim.ts";

export type JsonSchemaNode = Record<string, unknown>;

function typeWithNull(type: string, nullable: boolean): string | string[] {
  return nullable ? [type, "null"] : type;
}

function isNullable(options: Record<string, unknown>): boolean {
  return options["nullable"] === true;
}

function fieldOptions(field: unknown): Record<string, unknown> {
  return (field as { options?: Record<string, unknown> })?.options ?? {};
}

/** Converts a single field instance into a JSON Schema node. */
export function fieldToJsonSchema(field: unknown): JsonSchemaNode {
  if (field instanceof StringFieldShim) {
    const options = fieldOptions(field);
    const schema: JsonSchemaNode = { type: typeWithNull("string", isNullable(options)) };
    if (options["choices"] && typeof options["choices"] === "object") {
      schema.enum = Object.keys(options["choices"] as Record<string, unknown>);
    }
    if (options["blank"] === false) {
      schema.minLength = 1;
    }
    if (typeof options["initial"] === "string") {
      schema.default = options["initial"];
    }
    return schema;
  }

  if (field instanceof NumberFieldShim) {
    const options = fieldOptions(field);
    const schema: JsonSchemaNode = {
      type: typeWithNull(options["integer"] === true ? "integer" : "number", isNullable(options)),
    };
    if (typeof options["min"] === "number") {
      schema.minimum = options["min"];
    }
    if (typeof options["max"] === "number") {
      schema.maximum = options["max"];
    }
    if (typeof options["initial"] === "number") {
      schema.default = options["initial"];
    }
    return schema;
  }

  if (field instanceof BooleanFieldShim) {
    const options = fieldOptions(field);
    const schema: JsonSchemaNode = { type: typeWithNull("boolean", isNullable(options)) };
    if (typeof options["initial"] === "boolean") {
      schema.default = options["initial"];
    }
    return schema;
  }

  if (field instanceof ArrayFieldShim) {
    const options = fieldOptions(field);
    return {
      type: typeWithNull("array", isNullable(options)),
      items: fieldToJsonSchema(field.element),
    };
  }

  if (field instanceof SchemaFieldShim) {
    return schemaToJsonSchema(field.fields, isNullable(fieldOptions(field)));
  }

  if (field instanceof ObjectFieldShim || field instanceof DocumentUUIDFieldShim) {
    return { type: typeWithNull("object", isNullable(fieldOptions(field))) };
  }

  const kind = (field as { constructor?: { name?: string } })?.constructor?.name ?? typeof field;
  throw new Error(
    `generate-schema: unsupported field type "${kind}". ` +
      "Extend buildScripts/generate-schema/field-to-json-schema.ts to support it.",
  );
}

/**
 * Converts a Foundry `DataSchema` (a plain object mapping key -> field instance, as
 * returned by a DataModel's `defineSchema()`, or found under a nested
 * `SchemaField.fields`) into a JSON Schema object node.
 *
 * "required" heuristic: a property is considered required unless its field is
 * declared `nullable: true`. Every field in this codebase's DataModels provides an
 * `initial` default, so Foundry itself never truly *requires* a key to construct a
 * valid document — but for validating hand-authored compendium YAML content, whether
 * `null` is an acceptable value is the meaningful distinction, so that is what
 * "required" reflects here.
 */
export function schemaToJsonSchema(
  fields: Record<string, unknown>,
  nullable = false,
): JsonSchemaNode {
  const properties: Record<string, JsonSchemaNode> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries(fields)) {
    properties[key] = fieldToJsonSchema(field);
    if (!isNullable(fieldOptions(field))) {
      required.push(key);
    }
  }

  const schema: JsonSchemaNode = {
    type: typeWithNull("object", nullable),
    properties,
    additionalProperties: false,
  };
  if (required.length > 0) {
    schema.required = required;
  }
  return schema;
}
