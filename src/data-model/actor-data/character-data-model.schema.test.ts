import { describe, expect, it } from "vitest";
import { CharacterDataModel } from "./character-data-model";

type DataSchema = foundry.data.fields.DataSchema;

function getNestedSchema(field: unknown): DataSchema {
  const maybeSchema = (field as { schema?: DataSchema; fields?: DataSchema }) ?? {};
  return (maybeSchema.schema ?? maybeSchema.fields ?? {}) as DataSchema;
}

describe("CharacterDataModel accumulator schema", () => {
  it("declares attributes.magicPoints.max and attributes.hitPoints.max as non-persisted derived fields", () => {
    const schema = CharacterDataModel.defineSchema();
    const attributes = getNestedSchema(schema.attributes);
    const magicPoints = getNestedSchema(attributes["magicPoints"]);
    const hitPoints = getNestedSchema(attributes["hitPoints"]);

    const magicPointsMax = magicPoints["max"] as { options?: Record<string, unknown> };
    const hitPointsMax = hitPoints["max"] as { options?: Record<string, unknown> };

    expect(magicPointsMax.options?.["persisted"]).toBe(false);
    expect(magicPointsMax.options?.["nullable"]).toBe(false);
    expect(magicPointsMax.options?.["initial"]).toBe(0);

    expect(hitPointsMax.options?.["persisted"]).toBe(false);
    expect(hitPointsMax.options?.["nullable"]).toBe(false);
    expect(hitPointsMax.options?.["initial"]).toBe(0);
  });

  it("declares resource effect accumulators as non-persisted numeric fields", () => {
    const schema = CharacterDataModel.defineSchema();
    const effect = getNestedSchema(schema.effect);
    const add = getNestedSchema(effect["add"]);
    const magicPoints = getNestedSchema(add["magicPoints"]);
    const hitPoints = getNestedSchema(add["hitPoints"]);

    const magicPointsMax = magicPoints["max"] as { options?: Record<string, unknown> };
    const hitPointsMax = hitPoints["max"] as { options?: Record<string, unknown> };

    expect(magicPointsMax.options?.["persisted"]).toBe(false);
    expect(magicPointsMax.options?.["initial"]).toBe(0);

    expect(hitPointsMax.options?.["persisted"]).toBe(false);
    expect(hitPointsMax.options?.["initial"]).toBe(0);
  });

  it("declares skill category effect accumulators as non-persisted zero-initialized fields", () => {
    const schema = CharacterDataModel.defineSchema();
    const effect = getNestedSchema(schema.effect);
    const add = getNestedSchema(effect["add"]);
    const skillFromEffects = getNestedSchema(add["skillCategoryModifiers"]);

    const categories = [
      "agility",
      "communication",
      "knowledge",
      "magic",
      "manipulation",
      "perception",
      "stealth",
      "meleeWeapons",
      "missileWeapons",
      "shields",
      "naturalWeapons",
      "otherSkills",
    ] as const;

    for (const category of categories) {
      const categoryField = skillFromEffects[category] as {
        options?: Record<string, unknown>;
      };
      expect(categoryField.options?.["persisted"]).toBe(false);
      expect(categoryField.options?.["initial"]).toBe(0);
    }
  });
});
