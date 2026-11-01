import { beforeEach, describe, expect, it, vi } from "vitest";
import { reflectsSpell } from "./reflect-spell";
import { spellBehaviorForEffect } from "./spell-behavior";

vi.mock("./spell-behavior", () => ({ spellBehaviorForEffect: vi.fn() }));

const reflection = { name: "Reflection", active: true };
const spell = {
  type: "spiritMagic",
  name: "Befuddle",
  flags: {},
  system: { duration: "temporal" },
};
const target = { name: "Harrek", allApplicableEffects: () => [reflection] } as any;
const cast = {
  casterActorUuid: "Actor.c",
  casterTokenUuid: "Scene.s.Token.c",
  castMessageId: "cast",
  level: 2,
  magicPointsSpent: 3,
  runePointsSpent: 0,
  casterSuccessLevel: undefined,
};

function onResisted(outcome: "reflected" | "pass") {
  const hook = vi.fn(async () => ({ outcome }));
  vi.mocked(spellBehaviorForEffect).mockReturnValue({ onResisted: hook } as any);
  return hook;
}

describe("reflectsSpell", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs the target's onResisted hooks with the cast and their effects", async () => {
    const hook = onResisted("reflected");

    expect(await reflectsSpell(spell as any, target, "Harrek", cast)).toBe(true);
    expect(hook).toHaveBeenCalledWith(
      expect.objectContaining({ spell, targetActor: target, effects: [reflection], cast }),
    );
  });

  it("leaves the spell where it is when no effect reflects it", async () => {
    onResisted("pass");
    expect(await reflectsSpell(spell as any, target, "Harrek", cast)).toBe(false);
  });

  it("reflects nothing for a target with nothing that reflects", async () => {
    vi.mocked(spellBehaviorForEffect).mockReturnValue(undefined);
    expect(await reflectsSpell(spell as any, target, "Harrek", cast)).toBe(false);
  });
});
