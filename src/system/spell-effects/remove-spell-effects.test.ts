import { describe, expect, it } from "vitest";
import { matchesSpellEffectRemovalFilter } from "./remove-spell-effects";

const bladesharp4 = { spellRqid: "i.spirit-magic.bladesharp", casterUuid: "Actor.a", level: 4 };

describe("matchesSpellEffectRemovalFilter", () => {
  it("matches every spell effect with an empty filter", () => {
    expect(matchesSpellEffectRemovalFilter(bladesharp4, {})).toBe(true);
  });

  it("matches on spell, caster and maximum level", () => {
    expect(
      matchesSpellEffectRemovalFilter(bladesharp4, { spellRqid: "i.spirit-magic.bladesharp" }),
    ).toBe(true);
    expect(
      matchesSpellEffectRemovalFilter(bladesharp4, { spellRqid: "i.spirit-magic.dullblade" }),
    ).toBe(false);
    expect(matchesSpellEffectRemovalFilter(bladesharp4, { casterUuid: "Actor.b" })).toBe(false);
    expect(matchesSpellEffectRemovalFilter(bladesharp4, { maxLevel: 4 })).toBe(true);
    expect(matchesSpellEffectRemovalFilter(bladesharp4, { maxLevel: 3 })).toBe(false);
  });

  it("requires every given field to match", () => {
    expect(
      matchesSpellEffectRemovalFilter(bladesharp4, {
        spellRqid: "i.spirit-magic.bladesharp",
        casterUuid: "Actor.b",
      }),
    ).toBe(false);
  });
});
