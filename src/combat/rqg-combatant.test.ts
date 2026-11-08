import { beforeAll, describe, expect, it, vi } from "vitest";

let RqgCombatant: typeof import("./rqg-combatant").RqgCombatant;

beforeAll(async () => {
  vi.stubGlobal(
    "Combatant",
    class {
      static async _onCreateOperation() {}
      static async _onUpdateOperation() {}
      static async _onDeleteOperation() {}
    },
  );
  ({ RqgCombatant } = await import("./rqg-combatant"));
});

function mockActor() {
  const sheet = vi.fn();
  const actor = { render: vi.fn() };
  Object.defineProperty(actor, "sheet", { get: sheet });
  return { actor, sheet };
}

describe("RqgCombatant", () => {
  it.each(["_onCreateOperation", "_onUpdateOperation", "_onDeleteOperation"] as const)(
    "%s rerenders each actor's apps once, without creating its sheet",
    async (operation) => {
      const a = mockActor();
      const b = mockActor();
      const documents = [
        { actor: a.actor },
        { actor: a.actor },
        { actor: b.actor },
        { actor: null },
      ];

      await (RqgCombatant as any)[operation](documents, {}, {});

      expect(a.actor.render).toHaveBeenCalledOnce();
      expect(b.actor.render).toHaveBeenCalledOnce();
      expect(a.sheet).not.toHaveBeenCalled();
      expect(b.sheet).not.toHaveBeenCalled();
    },
  );
});
