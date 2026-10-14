import { afterEach, describe, expect, it, vi } from "vitest";
import { runSpellRollEntry } from "./spell-roll-entries";
import * as spellBehaviourModule from "./spell-behaviour";

const effect = (spellRqid: string, active = true) => ({ active, system: { spell: { spellRqid } } });

function actorWith(...effects: ReturnType<typeof effect>[]): any {
  return { allApplicableEffects: () => effects };
}

describe("runSpellRollEntry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function behaviours(byRqid: Record<string, spellBehaviourModule.SpellBehaviour>): void {
    vi.spyOn(spellBehaviourModule, "spellBehaviourForEffect").mockImplementation(
      (e: any) => byRqid[e.system.spell.spellRqid],
    );
  }

  it("calls each entry once with the hook's arguments and the effects sharing it", () => {
    const noParry = vi.fn();
    const halveDodge = vi.fn();
    behaviours({
      berserker: { onPreDefence: noParry },
      fanaticism: { onPreDefence: noParry },
      other: { onPreDefence: halveDodge },
    });
    const berserk = effect("berserker");
    const fanatic = effect("fanaticism");
    const other = effect("other");
    const defence = { defence: "parry" } as any;

    const result = runSpellRollEntry(actorWith(berserk, fanatic, other), "onPreDefence", {
      defender: {} as any,
      defence,
    });

    expect(result).toBe(true);
    expect(noParry).toHaveBeenCalledOnce();
    expect(noParry).toHaveBeenCalledWith(
      expect.objectContaining({ defence, effects: [berserk, fanatic] }),
    );
    expect(halveDodge).toHaveBeenCalledWith(expect.objectContaining({ effects: [other] }));
  });

  it("cancels the roll when an entry returns false, without running the rest", () => {
    const later = vi.fn();
    behaviours({ berserker: { onPreSpellCast: () => false }, other: { onPreSpellCast: later } });

    const result = runSpellRollEntry(
      actorWith(effect("berserker"), effect("other")),
      "onPreSpellCast",
      { spell: {} as any, caster: {} as any, options: {} as any },
    );

    expect(result).toBe(false);
    expect(later).not.toHaveBeenCalled();
  });

  it("skips inactive effects and other entries, and lets a roll without an actor through", () => {
    const entry = vi.fn();
    behaviours({ berserker: { onPreAttack: entry } });

    expect(runSpellRollEntry(actorWith(effect("berserker", false)), "onPreAttack", {} as any)).toBe(
      true,
    );
    expect(runSpellRollEntry(actorWith(effect("berserker")), "onPreDefence", {} as any)).toBe(true);
    expect(runSpellRollEntry(undefined, "onPreAttack", {} as any)).toBe(true);
    expect(entry).not.toHaveBeenCalled();
  });
});
