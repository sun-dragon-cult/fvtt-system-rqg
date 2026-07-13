import { describe, expect, it } from "vitest";
import {
  ArrayFieldShim,
  BooleanFieldShim,
  NumberFieldShim,
  SchemaFieldShim,
  StringFieldShim,
} from "./foundry-schema-shim";
import { fieldToJsonSchema, schemaToJsonSchema } from "./field-to-json-schema";

describe("fieldToJsonSchema", () => {
  it("converts a StringField with choices into a string enum", () => {
    const field = new StringFieldShim({
      blank: false,
      nullable: false,
      initial: "magic",
      choices: { magic: "label.magic", stealth: "label.stealth" },
    });

    expect(fieldToJsonSchema(field)).toEqual({
      type: "string",
      enum: ["magic", "stealth"],
      minLength: 1,
      default: "magic",
    });
  });

  it("converts a nullable NumberField into a nullable integer type with bounds", () => {
    const field = new NumberFieldShim({ integer: true, min: 0, nullable: true });

    expect(fieldToJsonSchema(field)).toEqual({
      type: ["integer", "null"],
      minimum: 0,
    });
  });

  it("converts a BooleanField with a default", () => {
    const field = new BooleanFieldShim({ nullable: false, initial: true });

    expect(fieldToJsonSchema(field)).toEqual({ type: "boolean", default: true });
  });

  it("converts an ArrayField into an array schema using the element field", () => {
    const field = new ArrayFieldShim(new StringFieldShim({ blank: true, nullable: false }));

    expect(fieldToJsonSchema(field)).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("converts a nullable SchemaField into a nullable object schema", () => {
    const field = new SchemaFieldShim(
      {
        rqid: new StringFieldShim({ blank: true, nullable: false, initial: "" }),
        bonus: new NumberFieldShim({ integer: true, nullable: true }),
      },
      { nullable: true },
    );

    expect(fieldToJsonSchema(field)).toEqual({
      type: ["object", "null"],
      properties: {
        rqid: { type: "string", default: "" },
        bonus: { type: ["integer", "null"] },
      },
      additionalProperties: false,
      required: ["rqid"],
    });
  });

  it("throws for an unsupported field type", () => {
    expect(() => fieldToJsonSchema({})).toThrow(/unsupported field type/);
  });
});

describe("schemaToJsonSchema", () => {
  it("marks non-nullable fields as required and omits nullable ones", () => {
    const schema = schemaToJsonSchema({
      skillName: new StringFieldShim({ blank: true, nullable: false, initial: "" }),
      descriptionRqidLink: new SchemaFieldShim(
        { rqid: new StringFieldShim({ blank: true, nullable: false, initial: "" }) },
        { nullable: true },
      ),
    });

    expect(schema.required).toEqual(["skillName"]);
    expect(schema.type).toBe("object");
    expect(schema.additionalProperties).toBe(false);
  });

  it("omits the required array entirely when every field is nullable", () => {
    const schema = schemaToJsonSchema({
      bonus: new NumberFieldShim({ integer: true, nullable: true }),
    });

    expect(schema.required).toBeUndefined();
  });
});
