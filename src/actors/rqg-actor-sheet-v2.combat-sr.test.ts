import { describe, expect, it, vi } from "vitest";
import { RqgActorSheetV2 } from "./rqg-actor-sheet-v2";

describe("RqgActorSheetV2 SR sync with unlinked tokens", () => {
  it("looks up combatants by the actor instance so sibling unlinked tokens are untouched", async () => {
    const actor = { id: "base", isToken: true };
    const getCombatantsByActor = vi.fn((a: unknown) =>
      a === actor
        ? [{ id: "c1", initiative: null, actorId: "base", tokenId: "t1", sceneId: "s" }]
        : [],
    );
    const combat = {
      getCombatantsByActor,
      deleteEmbeddedDocuments: vi.fn(),
      updateEmbeddedDocuments: vi.fn(),
      createEmbeddedDocuments: vi.fn(),
    };
    Object.defineProperty(game, "combat", { configurable: true, value: combat });

    const sheet = { actor } as unknown as object;
    await (RqgActorSheetV2.prototype as any)._updateActiveCombatWithSR.call(sheet, new Set([7]));

    expect(getCombatantsByActor).toHaveBeenCalledWith(actor);
    expect(combat.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    expect(combat.updateEmbeddedDocuments).toHaveBeenCalledWith("Combatant", [
      { _id: "c1", initiative: 7 },
    ]);
  });
});
