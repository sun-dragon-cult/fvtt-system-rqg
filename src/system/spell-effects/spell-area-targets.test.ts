import { describe, expect, it, vi } from "vitest";
import { spellAreaRadius, spellMaxTargets } from "./spell-area-targets";
import { spellBehaviorOf } from "./spell-behavior";

vi.mock("./spell-behavior", () => ({ spellBehaviorOf: vi.fn() }));

const spell = { name: "Harmony" } as any;

describe("spellAreaRadius", () => {
  it("asks the spell's behavior how far the cast level reaches, 0 without one", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue({ areaRadius: (level: number) => 3 * level });
    expect(spellAreaRadius(spell, 2)).toBe(6);
    vi.mocked(spellBehaviorOf).mockReturnValue(undefined);
    expect(spellAreaRadius(spell, 1)).toBe(0);
  });
});

describe("spellMaxTargets", () => {
  const cast = (targetKind: string, resistedBy = "none") =>
    ({ name: "Spell", system: { targetKind, resistedBy } }) as any;

  it("takes its behavior's count when it declares one", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue({ maxTargets: (level: number) => level });
    expect(spellMaxTargets(cast("spirit", "resistanceRollPerTarget"), 3)).toBe(3);
  });

  it("casts a spell at one creature or thing by default", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue(undefined);
    expect(spellMaxTargets(cast("creature"), 1)).toBe(1);
    expect(spellMaxTargets(cast("weapon"), 1)).toBe(1);
    expect(spellMaxTargets(cast("creature", "resistanceRoll"), 1)).toBe(1);
  });

  it("allows any number for a spell resisted per target or across an area, or an unset kind", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue(undefined);
    expect(spellMaxTargets(cast("creature", "resistanceRollPerTarget"), 1)).toBe(Infinity);
    expect(spellMaxTargets(cast("radius", "resistanceRollArea"), 1)).toBe(Infinity);
    expect(spellMaxTargets(cast("none"), 1)).toBe(Infinity);
    expect(spellMaxTargets(cast("area"), 1)).toBe(Infinity);
  });

  it("allows any number for a spell centered on its caster, which takes everyone in its area", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue({ areaRadius: () => 3 });
    expect(spellMaxTargets(cast("creature"), 1)).toBe(Infinity);
  });
});
