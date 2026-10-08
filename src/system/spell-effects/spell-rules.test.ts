import { describe, expect, it } from "vitest";
import { castStrength, effectRemovalCost, listSpellEffects } from "./spell-rules";

const spellEffect = (spell: Record<string, unknown> | null, expired = false) => ({
  system: { spell },
  duration: { expired },
});

describe("castStrength", () => {
  it("counts magic points once and Rune points twice", () => {
    expect(castStrength({ magicPointsSpent: 5, runePointsSpent: 1 })).toBe(7);
    expect(castStrength({ magicPointsSpent: 4, runePointsSpent: 0 })).toBe(4);
  });

  it("is 0 for a cast without points recorded", () => {
    expect(castStrength({})).toBe(0);
  });
});

describe("effectRemovalCost", () => {
  it("costs 1 per point of spirit magic", () => {
    expect(effectRemovalCost(spellEffect({ level: 4, magicPointsSpent: 4 }))).toBe(4);
  });

  it("costs 2 per Rune point, without the boost", () => {
    expect(
      effectRemovalCost(spellEffect({ level: 2, runePointsSpent: 2, magicPointsSpent: 3 })),
    ).toBe(4);
  });

  it("is 0 for an effect that isn't a spell", () => {
    expect(effectRemovalCost(spellEffect(null))).toBe(0);
    expect(effectRemovalCost({})).toBe(0);
  });
});

describe("listSpellEffects", () => {
  it("lists the spell effects on the actor and its items, leaving out expired ones and others", () => {
    const protection = spellEffect({ level: 2 });
    const bladesharp = spellEffect({ level: 4 });
    const expired = spellEffect({ level: 1 }, true);
    const notASpell = spellEffect(null);
    const actor = {
      effects: { contents: [protection, notASpell] },
      items: { contents: [{ effects: { contents: [bladesharp, expired] } }] },
    };
    expect(listSpellEffects(actor as any)).toEqual([protection, bladesharp]);
  });
});
