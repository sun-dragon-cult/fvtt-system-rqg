import { describe, expect, it, vi } from "vitest";
import { spellAreaRadius } from "./spell-cast-target-note";
import { spellBehaviorOf } from "../../system/spell-effects/spell-behavior";

vi.mock("../../system/spell-effects/spell-behavior", () => ({ spellBehaviorOf: vi.fn() }));

const spell = { name: "Harmony" } as any;

describe("spellAreaRadius", () => {
  it("asks the spell's behavior how far the cast level reaches", () => {
    vi.mocked(spellBehaviorOf).mockReturnValue({ areaRadius: (level: number) => 3 * level });
    expect(spellAreaRadius(spell, 2)).toBe(6);
  });

  it("is 0 without a behavior, or when its code throws or returns nonsense", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(spellBehaviorOf).mockReturnValue(undefined);
    expect(spellAreaRadius(spell, 1)).toBe(0);
    vi.mocked(spellBehaviorOf).mockReturnValue({
      areaRadius: () => {
        throw new Error("x");
      },
    });
    expect(spellAreaRadius(spell, 1)).toBe(0);
    vi.mocked(spellBehaviorOf).mockReturnValue({ areaRadius: () => "far" as any });
    expect(spellAreaRadius(spell, 1)).toBe(0);
    vi.restoreAllMocks();
  });
});
