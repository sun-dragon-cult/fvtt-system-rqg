import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveActor, resolveItem } from "./api-resolve";

function mockActor(name: string, items: any[] = [], token: any = null): any {
  return {
    documentName: "Actor",
    name,
    token,
    items: {
      contents: items,
      get: (id: string) => items.find((i) => i.id === id),
    },
    getBestEmbeddedDocumentByRqid: (rqid: string) =>
      items.find((i) => i.flags?.rqg?.documentRqidFlags?.id === rqid),
  };
}

function mockTokenDocument(actor: any): any {
  return { documentName: "Token", uuid: "Scene.s.Token.t", actor };
}

describe("resolveActor", () => {
  const originalGame = { ...game };

  afterEach(() => {
    (globalThis as any).canvas = undefined;
    Object.assign(game, originalGame);
    (game as any).user = undefined;
  });

  it("uses a given actor and its token", () => {
    const token = { documentName: "Token" };
    const actor = mockActor("Vasana", [], token);
    expect(resolveActor(actor)).toEqual({ actor, token });
  });

  it("uses the actor of a token document or placeable", () => {
    const actor = mockActor("Vasana");
    const tokenDocument = mockTokenDocument(actor);
    expect(resolveActor(tokenDocument)).toEqual({ actor, token: tokenDocument });
    expect(resolveActor({ document: tokenDocument } as any)).toEqual({
      actor,
      token: tokenDocument,
    });
  });

  it("looks up a string as uuid, id or name", () => {
    const actor = mockActor("Mr. Smith");
    vi.mocked(fromUuidSync).mockReturnValue(actor);
    expect(resolveActor("Actor.abcdefghijklmnop").actor).toBe(actor);

    (game as any).actors = {
      get: vi.fn(() => undefined),
      getName: vi.fn((name: string) => (name === "Mr. Smith" ? actor : undefined)),
    };
    expect(resolveActor("Mr. Smith").actor).toBe(actor);
    expect(fromUuidSync).toHaveBeenCalledTimes(1);
  });

  it("defaults to the first controlled token, then the user's character", () => {
    const tokenActor = mockActor("Selected");
    const tokenDocument = mockTokenDocument(tokenActor);
    (globalThis as any).canvas = { tokens: { controlled: [{ document: tokenDocument }] } };
    expect(resolveActor().actor).toBe(tokenActor);

    const character = mockActor("Character");
    (globalThis as any).canvas = { tokens: { controlled: [] } };
    (game as any).user = { character };
    expect(resolveActor()).toEqual({ actor: character, token: null });
  });

  it("throws when there is nothing to resolve", () => {
    (globalThis as any).canvas = { tokens: { controlled: [] } };
    expect(() => resolveActor()).toThrow();
    (game as any).actors = { get: () => undefined, getName: () => undefined };
    expect(() => resolveActor("Nobody")).toThrow(/Nobody/);
  });
});

describe("resolveItem", () => {
  const scan = {
    id: "scan-id",
    name: "Scan",
    type: "skill",
    flags: { rqg: { documentRqidFlags: { id: "i.skill.scan" } } },
  };
  const scanWeapon = { id: "weapon-id", name: "Scan", type: "weapon" };
  const actor = mockActor("Vasana", [scanWeapon, scan]);

  it("finds by id, rqid and name", () => {
    expect(resolveItem(actor, "scan-id", ["skill"])).toBe(scan);
    expect(resolveItem(actor, "i.skill.scan", ["skill"])).toBe(scan);
    expect(resolveItem(actor, "Scan", ["skill"])).toBe(scan);
    expect(resolveItem(actor, "scan", ["skill", "rune"])).toBe(scan);
  });

  it("accepts an item document of an allowed type", () => {
    expect(resolveItem(actor, scan as any, ["skill"])).toBe(scan);
  });

  it("throws on a missing item or the wrong type", () => {
    expect(() => resolveItem(actor, "Dodge", ["skill"])).toThrow(/Dodge/);
    expect(() => resolveItem(actor, "weapon-id", ["skill"])).toThrow(/weapon/);
  });
});
