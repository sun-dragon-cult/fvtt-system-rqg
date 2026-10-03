import { describe, expect, it } from "vitest";
import { groupByIncomingSpellMacro } from "./incoming-spell";

const effect = (macro: string | undefined, active = true) => ({
  active,
  flags: macro ? { rqg: { onIncomingSpell: macro } } : {},
});

describe("groupByIncomingSpellMacro", () => {
  it("groups effects that link the same macro, so layered defences are decided together", () => {
    const countermagic = effect("m..spell-barrier");
    const shield = effect("m..spell-barrier");
    const absorption = effect("m..absorption");
    const groups = groupByIncomingSpellMacro([countermagic, shield, absorption]);
    expect([...groups.keys()]).toEqual(["m..spell-barrier", "m..absorption"]);
    expect(groups.get("m..spell-barrier")).toEqual([countermagic, shield]);
  });

  it("leaves out effects without a macro and inactive (expired or suppressed) ones", () => {
    const groups = groupByIncomingSpellMacro([
      effect(undefined),
      effect("m..spell-barrier", false),
    ]);
    expect(groups.size).toBe(0);
  });
});
