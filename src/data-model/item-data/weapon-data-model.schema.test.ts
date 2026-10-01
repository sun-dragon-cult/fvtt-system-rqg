import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  const weapon = (magicDamage: number, damageDice = "", diceMultiplier = 1) =>
    ({
      usage: { oneHand: { damage: "1d8+1+db" } },
      effect: {
        add: {
          melee: { damage: magicDamage, damageDice: damageDice },
          missile: { damage: 0, damageDice: "" },
        },
        multiply: { melee: { damage: diceMultiplier }, missile: { damage: 1 } },
      },
      parent: { parent: { type: "character", system: { attributes: { damageBonus: "1d4" } } } },
      getMaximisedDamageBonusValue: () => "4",
    }) as any;
  const formula = (
    magicDamage: number,
    degree: string,
    type: string,
    damageDice = "",
    diceMultiplier = 1,
  ) =>
    WeaponDataModel.prototype.getDamageFormula.call(
      weapon(magicDamage, damageDice, diceMultiplier),
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

  it("adds magical damage dice once, even on a slashing special", () => {
    const result = formula(0, "special", "slash", "+(2)d6")!;
    expect(result.match(/\(2\)d6/g)).toHaveLength(1);
    expect(result).toMatch(/SpecialDamage.*\+\(2\)d6\[RQG\.Roll\.DamageRoll\.MagicDamage/);
  });

  it("adds the extra weapon dice once as magic damage, without the damage bonus, with a multiplier of 2", () => {
    const result = formula(0, "normal", "slash", "", 2)!;
    expect(result).toMatch(/^\(1d8\+1\)\[RQG\.Roll\.DamageRoll\.WeaponDamage/);
    expect(result).toMatch(/\+\(1d8\+1\)\[RQG\.Roll\.DamageRoll\.MagicDamage/);
    expect(result.match(/db/g)).toHaveLength(1);
  });

  it("adds only one extra set of weapon dice on a slashing special with a multiplier of 2 (Core p.204)", () => {
    expect(formula(0, "special", "slash", "", 2)!.match(/1d8/g)).toHaveLength(3);
  });

  describe("criticals", () => {
    beforeAll(() => {
      // 1d8+1 maximised is 9
      vi.stubGlobal(
        "Roll",
        class {
          total?: number;
          evaluateSync() {
            this.total = 9;
          }
        },
      );
    });
    afterAll(() => {
      vi.unstubAllGlobals();
    });

    it("maximises two sets and rolls the extra weapon dice once on a critical impale with a multiplier of 2", () => {
      const result = formula(0, "maxSpecial", "impale", "", 2)!;
      expect(result.match(/\b9\[/g)).toHaveLength(2);
      expect(result).toMatch(/\+\(1d8\+1\)\[RQG\.Roll\.DamageRoll\.MagicDamage/);
    });

    it.each(["slash", "impale", "crush"])(
      "leaves only magical dice in a critical %s, since the roll is no longer maximised",
      (type) => {
        const result = formula(2, "maxSpecial", type, "+(2)d6", 2)!;
        const withoutMagic = result.replace(
          /[^[\]]*\[RQG\.Roll\.DamageRoll\.MagicDamage[^\]]*\]/g,
          "",
        );
        expect(withoutMagic).not.toMatch(/d\d/);
        expect(result).toMatch(/\(1d8\+1\)\[RQG\.Roll\.DamageRoll\.MagicDamage/);
        expect(result).toMatch(/\(2\)d6\[RQG\.Roll\.DamageRoll\.MagicDamage/);
      },
    );

    it("leaves a critical alone when the multiplier is 1", () => {
      expect(formula(0, "maxSpecial", "impale")).not.toContain("MagicDamage");
    });
  });
});
