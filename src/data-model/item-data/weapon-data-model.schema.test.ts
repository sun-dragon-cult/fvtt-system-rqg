import { describe, expect, it } from "vitest";
import { WeaponDataModel } from "./weapon-data-model";

type DataSchema = foundry.data.fields.DataSchema;

function getNestedSchema(field: unknown): DataSchema {
  const maybeSchema = (field as { schema?: DataSchema; fields?: DataSchema }) ?? {};
  return (maybeSchema.schema ?? maybeSchema.fields ?? {}) as DataSchema;
}

describe("WeaponDataModel effect schema", () => {
  it("declares melee and missile effect accumulators as non-persisted zero-initialized fields", () => {
    const schema = WeaponDataModel.defineSchema();
    const effect = getNestedSchema(schema.effect);
    const add = getNestedSchema(effect["add"]);

    const groups = ["melee", "missile"] as const;
    const keys = ["attack", "parry"] as const;

    for (const group of groups) {
      const groupSchema = getNestedSchema(add[group]);
      for (const key of keys) {
        const field = groupSchema[key] as { options?: Record<string, unknown> };
        expect(field.options?.["persisted"]).toBe(false);
        expect(field.options?.["initial"]).toBe(0);
        expect(field.options?.["nullable"]).toBe(false);
      }
    }
  });
});
