import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeAllCharacteristics = vi.hoisted(() => vi.fn());
vi.mock("../actors/context-menus/characteristic-context-menu", () => ({
  initializeAllCharacteristics,
}));

import { onCreateToken, onHoverToken } from "./token-hooks";

function tokenDoc(actorLink: boolean, type = "character") {
  const actor = { type, updateTokenEffectFromHealth: vi.fn() };
  return { actor, actorLink } as any;
}

describe("onCreateToken", () => {
  beforeEach(() => {
    initializeAllCharacteristics.mockReset();
    Object.defineProperty(game, "user", { configurable: true, value: { id: "me" } });
  });

  it("sets up an unlinked token on the creating user's client", async () => {
    const doc = tokenDoc(false);
    await onCreateToken(doc, {} as any, "me");
    expect(doc.actor.updateTokenEffectFromHealth).toHaveBeenCalledOnce();
    expect(initializeAllCharacteristics).toHaveBeenCalledWith(doc.actor);
  });

  it("does not initialize characteristics for a linked token", async () => {
    const doc = tokenDoc(true);
    await onCreateToken(doc, {} as any, "me");
    expect(doc.actor.updateTokenEffectFromHealth).toHaveBeenCalledOnce();
    expect(initializeAllCharacteristics).not.toHaveBeenCalled();
  });

  it("does nothing on other users' clients", async () => {
    const doc = tokenDoc(false);
    await onCreateToken(doc, {} as any, "someone-else");
    expect(doc.actor.updateTokenEffectFromHealth).not.toHaveBeenCalled();
    expect(initializeAllCharacteristics).not.toHaveBeenCalled();
  });
});

describe("onHoverToken", () => {
  function combatant(id: string, tokenId: string) {
    return { id, tokenId };
  }

  function tokenWithCombatants(shared: any[]) {
    const actor = { getDependentTokens: () => [{ id: "t1" }] };
    const own = { ...shared[0], actor, sceneId: "s", parent: { combatants: shared } };
    return { combatant: own, id: "t1" } as any;
  }

  beforeEach(() => {
    Object.defineProperty(game, "scenes", { configurable: true, value: { get: () => undefined } });
  });

  it("highlights every combatant sharing the token on hover and clears them on hover out", () => {
    const hoverCombatant = vi.fn();
    Object.defineProperty(ui, "combat", {
      configurable: true,
      value: { hoverCombatant, _isTokenVisible: () => true },
    });
    const token = tokenWithCombatants([combatant("c1", "t1"), combatant("c2", "t1")]);

    onHoverToken(token, true);
    expect(hoverCombatant.mock.calls.map(([c, on]) => [c.id, on])).toEqual([
      ["c1", true],
      ["c2", true],
    ]);

    hoverCombatant.mockClear();
    onHoverToken(token, false);
    expect(hoverCombatant.mock.calls.map(([c, on]) => [c.id, on])).toEqual([
      ["c1", false],
      ["c2", false],
    ]);
  });

  it("does nothing for a token that is not in combat", () => {
    const hoverCombatant = vi.fn();
    Object.defineProperty(ui, "combat", { configurable: true, value: { hoverCombatant } });
    onHoverToken({ combatant: null } as any, true);
    expect(hoverCombatant).not.toHaveBeenCalled();
  });
});
