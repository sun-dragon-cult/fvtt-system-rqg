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
    const keys = ["attack", "parry", "damage"] as const;

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

describe("WeaponDataModel.getDamageFormula magic damage", () => {
  const weapon = (magicDamage: number) =>
    ({
      usage: { oneHand: { damage: "1d8+1" } },
      effect: { add: { melee: { damage: magicDamage }, missile: { damage: 0 } } },
      parent: { parent: { type: "character", system: { attributes: { damageBonus: "1d4" } } } },
      getMaximisedDamageBonusValue: () => "4",
    }) as any;
  const formula = (magicDamage: number, degree: string, type: string) =>
    WeaponDataModel.prototype.getDamageFormula.call(
      weapon(magicDamage),
      "oneHand",
      degree as any,
      type as any,
    );

  it("adds it once on a slashing special, after the doubled weapon damage", () => {
    const result = formula(4, "special", "slash")!;
    expect(result.match(/\+4\[/g)).toHaveLength(1);
    expect(result).toMatch(/SpecialDamage.*\+4\[RQG\.Roll\.DamageRoll\.MagicDamage/);
  });

  it("subtracts a negative magic damage", () => {
    expect(formula(-3, "normal", "slash")).toMatch(/-3\[RQG\.Roll\.DamageRoll\.MagicDamage/);
  });

  it("adds nothing when there is no magic damage", () => {
    expect(formula(0, "normal", "slash")).not.toContain("MagicDamage");
  });
});
