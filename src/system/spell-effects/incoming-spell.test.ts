import { describe, expect, it, vi } from "vitest";
import { groupEffectsByHook, interceptIncomingSpell } from "./incoming-spell";

const stopAll = vi.fn(async () => ({ outcome: "stopped" as const }));
vi.mock("./spell-behavior", () => ({
  spellBehaviorForEffect: () => ({ onIncomingSpell: stopAll }),
}));
const meetBarriers = vi.fn(async () => false);
vi.mock("./spell-barriers", () => ({
  meetBarriers: (...args: unknown[]) => meetBarriers(...(args as [])),
}));
vi.mock("./spell-across", () => ({
  tokenOfDocument: () => undefined,
  tokenOfUuid: () => undefined,
}));
vi.mock("../../applications/resistance-roll-dialog/resistance-roll-shared", () => ({
  resolveActorFromUuid: (uuid: string) => ({ uuid }),
}));

const spellBarrier = async () => ({ outcome: "pass" as const });
const absorption = async () => ({ outcome: "pass" as const });

const effect = (hook: typeof spellBarrier | undefined, active = true) => ({ active, hook });
const hookOf = (e: ReturnType<typeof effect>) => e.hook;

describe("groupEffectsByHook", () => {
  it("groups effects whose spells share a hook, so layered defences are decided together", () => {
    const countermagic = effect(spellBarrier);
    const shield = effect(spellBarrier);
    const absorbing = effect(absorption);
    const groups = groupEffectsByHook([countermagic, shield, absorbing], hookOf);
    expect([...groups.keys()]).toEqual([spellBarrier, absorption]);
    expect(groups.get(spellBarrier)).toEqual([countermagic, shield]);
  });

  it("leaves out effects without a hook and inactive (expired or suppressed) ones", () => {
    const groups = groupEffectsByHook([effect(undefined), effect(spellBarrier, false)], hookOf);
    expect(groups.size).toBe(0);
  });
});

describe("interceptIncomingSpell", () => {
  const caster = { uuid: "Actor.caster", allApplicableEffects: () => [{ active: true }] };
  const scope = {
    spell: { name: "Fireblade", system: {} },
    cast: { caster: { actorUuid: "Actor.caster", tokenUuid: "" } },
    targetActor: caster,
  } as any;

  it("lets a spell its target cast on themselves past their own protective spells", async () => {
    expect(await interceptIncomingSpell(scope)).toBeUndefined();
  });

  it("stops a spell reflected back at its caster, as it comes from the one who reflected it", async () => {
    expect(await interceptIncomingSpell(scope, true)).toEqual({
      outcome: "blocked",
      reason: "intercepted",
    });
  });
});

describe("interceptIncomingSpell barriers", () => {
  const target = { uuid: "Actor.target", allApplicableEffects: () => [] };
  const scopeFor = (system: object) =>
    ({
      spell: { name: "Fireblade", system },
      cast: { caster: { actorUuid: "Actor.caster", tokenUuid: "" } },
      targetActor: target,
    }) as any;

  it("blocks a spell the barriers stop", async () => {
    meetBarriers.mockResolvedValueOnce(true);
    expect(await interceptIncomingSpell(scopeFor({}))).toEqual({
      outcome: "blocked",
      reason: "intercepted",
    });
  });

  it("doesn't meet the barriers with a spell that passes them", async () => {
    meetBarriers.mockClear();
    expect(await interceptIncomingSpell(scopeFor({ passesSpellBarriers: true }))).toBeUndefined();
    expect(meetBarriers).not.toHaveBeenCalled();
  });
});
