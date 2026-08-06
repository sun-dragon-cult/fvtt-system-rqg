import { describe, expect, it } from "vitest";
import { migrateSpellBooleanFields } from "./spell-schema-fields";

describe("migrateSpellBooleanFields", () => {
  it("rewrites a trailing-comma string typo back to a real boolean", () => {
    const source: Record<string, unknown> = { isRitual: "true," };

    migrateSpellBooleanFields(source);

    expect(source["isRitual"]).toBe(true);
  });

  it("rewrites a plain string 'false' to a real boolean", () => {
    const source: Record<string, unknown> = { isEnchantment: "false" };

    migrateSpellBooleanFields(source);

    expect(source["isEnchantment"]).toBe(false);
  });

  it("leaves already-boolean values untouched", () => {
    const source: Record<string, unknown> = { isRitual: true, isEnchantment: false };

    migrateSpellBooleanFields(source);

    expect(source["isRitual"]).toBe(true);
    expect(source["isEnchantment"]).toBe(false);
  });

  it("does nothing when the fields are absent", () => {
    const source: Record<string, unknown> = {};

    expect(() => migrateSpellBooleanFields(source)).not.toThrow();
    expect(source).toEqual({});
  });
});
