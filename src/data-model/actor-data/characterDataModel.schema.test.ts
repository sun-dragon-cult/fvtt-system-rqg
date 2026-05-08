import { describe, expect, it } from "vitest";
import { CharacterDataModel } from "./characterDataModel";

type DataSchema = foundry.data.fields.DataSchema;

function getNestedSchema(field: unknown): DataSchema {
  const maybeSchema = (field as { schema?: DataSchema; fields?: DataSchema }) ?? {};
  return (maybeSchema.schema ?? maybeSchema.fields ?? {}) as DataSchema;
}

describe("CharacterDataModel accumulator schema", () => {
  it("declares resource effect accumulators as non-persisted numeric fields", () => {
    const schema = CharacterDataModel.defineSchema();
    const effect = getNestedSchema(schema.effect);
    const magicPoints = getNestedSchema(effect["magicPoints"]);
    const hitPoints = getNestedSchema(effect["hitPoints"]);

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
    const skillFromEffects = getNestedSchema(effect["skillCategoryModifiers"]);

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
