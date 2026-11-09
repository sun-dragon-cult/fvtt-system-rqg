import { describe, expect, it } from "vitest";
import {
  ArrayFieldShim,
  BooleanFieldShim,
  DocumentUUIDFieldShim,
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

  it("converts a nullable DocumentUUIDField into a nullable string type, not an object", () => {
    const field = new DocumentUUIDFieldShim({ nullable: true });

    expect(fieldToJsonSchema(field)).toEqual({ type: ["string", "null"] });
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

describe("schemaToJsonSchema labels and calculated fields", () => {
  const fields = {
    hitPoints: new SchemaFieldShim({
      value: new NumberFieldShim({ integer: true, initial: 0 }),
      max: new NumberFieldShim({ integer: true, nullable: false, initial: 0, persisted: false }),
    }),
  };

  it("adds title and description from the describer, using the nested field path", () => {
    const texts: Record<string, { label: string; hint?: string }> = {
      hitPoints: { label: "Hit points" },
      "hitPoints.max": { label: "Maximum hit points", hint: "Calculated." },
    };

    const schema = schemaToJsonSchema(fields, false, (path) => texts[path.join(".")]) as any;

    expect(schema.properties.hitPoints.title).toBe("Hit points");
    expect(schema.properties.hitPoints.properties.max).toMatchObject({
      title: "Maximum hit points",
      description: "Calculated.",
    });
    expect(schema.properties.hitPoints.properties.value.title).toBeUndefined();
  });

  it("marks persisted: false fields as not stored, with or without a describer", () => {
    const schema = schemaToJsonSchema(fields) as any;

    expect(schema.properties.hitPoints.properties.max["x-rqg-stored"]).toBe(false);
    expect(schema.properties.hitPoints.properties.max["x-rqg-effectTarget"]).toBeUndefined();
    expect(schema.properties.hitPoints.properties.value["x-rqg-stored"]).toBeUndefined();
  });

  it("marks not stored fields under effect as effect targets", () => {
    const schema = schemaToJsonSchema({
      ...fields,
      effect: new SchemaFieldShim({
        add: new SchemaFieldShim({
          hitPoints: new NumberFieldShim({ integer: true, initial: 0, persisted: false }),
        }),
      }),
    }) as any;

    expect(schema.properties.effect.properties.add.properties.hitPoints).toMatchObject({
      "x-rqg-stored": false,
      "x-rqg-effectTarget": true,
    });
  });
});
