import { describe, expect, it } from "vitest";
import { groupByIncomingSpellHook } from "./incoming-spell";

const spellBarrier = async () => ({ outcome: "pass" as const });
const absorption = async () => ({ outcome: "pass" as const });

const effect = (hook: typeof spellBarrier | undefined, active = true) => ({ active, hook });
const hookOf = (e: ReturnType<typeof effect>) => e.hook;

describe("groupByIncomingSpellHook", () => {
  it("groups effects whose spells share a hook, so layered defences are decided together", () => {
    const countermagic = effect(spellBarrier);
    const shield = effect(spellBarrier);
    const absorbing = effect(absorption);
    const groups = groupByIncomingSpellHook([countermagic, shield, absorbing], hookOf);
    expect([...groups.keys()]).toEqual([spellBarrier, absorption]);
    expect(groups.get(spellBarrier)).toEqual([countermagic, shield]);
  });

  it("leaves out effects without a hook and inactive (expired or suppressed) ones", () => {
    const groups = groupByIncomingSpellHook(
      [effect(undefined), effect(spellBarrier, false)],
      hookOf,
    );
    expect(groups.size).toBe(0);
  });
});
