import { beforeEach, describe, expect, it, vi } from "vitest";

const initializeAllCharacteristics = vi.hoisted(() => {
  (globalThis as any).foundry.canvas = { placeables: { Token: class {} } };
  return vi.fn();
});
vi.mock("../actors/context-menus/characteristic-context-menu", () => ({
  initializeAllCharacteristics,
}));

import { RqgToken } from "./rqg-token";

function tokenDoc(actorLink: boolean, type = "character") {
  const actor = { type, updateTokenEffectFromHealth: vi.fn() };
  return { actor, actorLink } as any;
}

describe("RqgToken.onCreateToken", () => {
  beforeEach(() => {
    initializeAllCharacteristics.mockReset();
    Object.defineProperty(game, "user", { configurable: true, value: { id: "me" } });
  });

  it("sets up an unlinked token on the creating user's client", async () => {
    const doc = tokenDoc(false);
    await RqgToken.onCreateToken(doc, {} as any, "me");
    expect(doc.actor.updateTokenEffectFromHealth).toHaveBeenCalledOnce();
    expect(initializeAllCharacteristics).toHaveBeenCalledWith(doc.actor);
  });

  it("does not initialize characteristics for a linked token", async () => {
    const doc = tokenDoc(true);
    await RqgToken.onCreateToken(doc, {} as any, "me");
    expect(doc.actor.updateTokenEffectFromHealth).toHaveBeenCalledOnce();
    expect(initializeAllCharacteristics).not.toHaveBeenCalled();
  });

  it("does nothing on other users' clients", async () => {
    const doc = tokenDoc(false);
    await RqgToken.onCreateToken(doc, {} as any, "someone-else");
    expect(doc.actor.updateTokenEffectFromHealth).not.toHaveBeenCalled();
    expect(initializeAllCharacteristics).not.toHaveBeenCalled();
  });
});
