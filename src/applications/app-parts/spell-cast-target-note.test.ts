import { describe, expect, it, vi } from "vitest";
import { spellAreaRadius } from "./spell-cast-target-note";
import { spellBehaviorOf } from "../../system/spell-effects/spell-behavior";

vi.mock("../../system/spell-effects/spell-behavior", () => ({ spellBehaviorOf: vi.fn() }));

const spell = { name: "Harmony" } as any;

describe("spellAreaRadius", () => {
  it("asks the spell's behavior how far the cast level reaches, 0 without one", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue({ areaRadius: (level: number) => 3 * level });
    expect(spellAreaRadius(spell, 2)).toBe(6);
    vi.mocked(spellBehaviorOf).mockReturnValue(undefined);
    expect(spellAreaRadius(spell, 1)).toBe(0);
  });
});
