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
      berserker: { onPrepareDefence: noParry },
      fanaticism: { onPrepareDefence: noParry },
      other: { onPrepareDefence: halveDodge },
    });
    const berserk = effect("berserker");
    const fanatic = effect("fanaticism");
    const other = effect("other");
    const defence = { defence: "parry" } as any;
    const preparation = {};

    runSpellRollEntry(actorWith(berserk, fanatic, other), "onPrepareDefence", {
      defender: {} as any,
      defence,
      preparation,
    });

    expect(noParry).toHaveBeenCalledOnce();
    expect(noParry).toHaveBeenCalledWith(
      expect.objectContaining({ defence, preparation, effects: [berserk, fanatic] }),
    );
    expect(halveDodge).toHaveBeenCalledWith(expect.objectContaining({ effects: [other] }));
  });

  it("skips inactive effects and other entries, and a roll without an actor", () => {
    const entry = vi.fn();
    behaviours({ berserker: { onPrepareAttack: entry } });

    runSpellRollEntry(actorWith(effect("berserker", false)), "onPrepareAttack", {} as any);
    runSpellRollEntry(actorWith(effect("berserker")), "onPrepareDefence", {} as any);
    runSpellRollEntry(undefined, "onPrepareAttack", {} as any);
    expect(entry).not.toHaveBeenCalled();
  });
});
