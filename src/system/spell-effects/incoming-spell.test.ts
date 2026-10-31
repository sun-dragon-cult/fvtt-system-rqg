import { describe, expect, it, vi } from "vitest";
import { groupEffectsByHook, interceptIncomingSpell } from "./incoming-spell";

const stopAll = vi.fn(async () => ({ outcome: "stopped" as const }));
vi.mock("./spell-behavior", () => ({
  spellBehaviorForEffect: () => ({ onIncomingSpell: stopAll }),
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
    cast: { casterActorUuid: "Actor.caster", casterTokenUuid: "" },
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
