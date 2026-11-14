import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAnchored,
  holdsRegion,
  initSpellAnchors,
  reconcileSpellAnchors,
  releaseHeld,
} from "./spell-anchor";

/** A world of documents by uuid, which `fromUuidSync` finds while they exist. */
let documents: Map<string, any>;

function doc(uuid: string, flags: Record<string, unknown> = {}, extra: object = {}) {
  const document: any = {
    uuid,
    id: uuid.split(".").at(-1),
    flags,
    getFlag: (_scope: string, key: string) => document.flags[key],
    delete: vi.fn(async () => documents.delete(uuid)),
    ...extra,
  };
  documents.set(uuid, document);
  return document;
}

function actor(uuid: string, effects: any[] = [], extra: object = {}) {
  const parent = doc(
    uuid,
    {},
    {
      effects: { contents: effects },
      isToken: false,
      getActiveTokens: () => [],
      createEmbeddedDocuments: vi.fn(async (_type: string, [data]: any[]) => [
        doc(`${uuid}.ActiveEffect.${data._id}`, data.flags.rqg),
      ]),
      deleteEmbeddedDocuments: vi.fn(async (_type: string, ids: string[]) =>
        ids.forEach((id) => documents.delete(`${uuid}.ActiveEffect.${id}`)),
      ),
      ...extra,
    },
  );
  return parent;
}

function scene(regions: any[] = [], tokens: any[] = []) {
  return { regions: { contents: regions }, tokens: { contents: tokens } };
}

const hold = (uuid: string) => ({ kind: "document", uuid });

describe("spell anchors", () => {
  beforeEach(() => {
    documents = new Map();
    vi.stubGlobal("fromUuidSync", (uuid: string) => documents.get(uuid) ?? null);
    vi.stubGlobal("game", { users: { activeGM: { isSelf: true } }, scenes: { contents: [] } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("createAnchored", () => {
    it("makes the documents with a back-reference, then the effect that holds them", async () => {
      const caster = actor("Actor.c");
      let heldBy = "";
      const result = await createAnchored({
        effectParentUuid: "Actor.c",
        effectData: { name: "Shake Earth" },
        create: async (by) => {
          heldBy = by;
          return [doc("Scene.s.Region.r", { heldBy: by })];
        },
      });
      expect(result?.effect.uuid).toBe(heldBy);
      expect(heldBy).toMatch(/^Actor\.c\.ActiveEffect\./);
      const [, [data], options] = caster.createEmbeddedDocuments.mock.calls[0];
      expect(data).toMatchObject({
        name: "Shake Earth",
        flags: { rqg: { holds: [hold("Scene.s.Region.r")] } },
      });
      expect(options).toEqual({ keepId: true });
    });

    it("deletes what it made when the effect can't be written", async () => {
      actor("Actor.c", [], {
        createEmbeddedDocuments: vi.fn(async () => {
          throw new Error("no");
        }),
      });
      vi.spyOn(console, "warn").mockImplementation(() => {});
      let region: any;
      const result = await createAnchored({
        effectParentUuid: "Actor.c",
        effectData: {},
        create: async (by) => [(region = doc("Scene.s.Region.r", { heldBy: by }))],
      });
      expect(result).toBeUndefined();
      expect(region.delete).toHaveBeenCalledOnce();
    });

    it("deletes what it made when the effect's parent is missing", async () => {
      let region: any;
      const result = await createAnchored({
        effectParentUuid: "Actor.gone",
        effectData: {},
        create: async (by) => [(region = doc("Scene.s.Region.r", { heldBy: by }))],
      });
      expect(result).toBeUndefined();
      expect(region.delete).toHaveBeenCalledOnce();
    });

    it("makes no effect when nothing was made", async () => {
      const caster = actor("Actor.c");
      expect(
        await createAnchored({
          effectParentUuid: "Actor.c",
          effectData: {},
          create: async () => [],
        }),
      ).toBeUndefined();
      expect(caster.createEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });

  it("deletes what an ended effect held, and says whether there was anything", async () => {
    const region = doc("Scene.s.Region.r");
    const effect = doc("Actor.c.ActiveEffect.e", {
      holds: [hold("Scene.s.Region.r"), hold("Scene.s.Token.gone")],
    });
    expect(await releaseHeld(effect)).toBe(true);
    expect(region.delete).toHaveBeenCalledOnce();
    expect(await releaseHeld(effect)).toBe(false);
  });

  it("tells an effect holding a Region from one holding a token", () => {
    const area = doc("Actor.c.ActiveEffect.a", { holds: [hold("Scene.s.Region.r")] });
    const summoning = doc("Actor.c.ActiveEffect.b", { holds: [hold("Scene.s.Token.t")] });
    expect(holdsRegion(area as any)).toBe(true);
    expect(holdsRegion(summoning as any)).toBe(false);
  });

  describe("reconcileSpellAnchors", () => {
    it("deletes held documents whose effect is gone, e.g. lost with its caster's token", async () => {
      const orphan = doc("Scene.s.Region.orphan", {
        heldBy: "Scene.s.Token.gone.Actor.a.ActiveEffect.e",
      });
      const kept = doc("Scene.s.Region.kept", { heldBy: "Actor.c.ActiveEffect.e" });
      const unheld = doc("Scene.s.Region.ward");
      actor("Actor.c", [doc("Actor.c.ActiveEffect.e", { holds: [hold("Scene.s.Region.kept")] })]);
      (game as any).scenes.contents = [scene([orphan, kept, unheld])];
      await reconcileSpellAnchors();
      expect(orphan.delete).toHaveBeenCalledOnce();
      expect(kept.delete).not.toHaveBeenCalled();
      expect(unheld.delete).not.toHaveBeenCalled();
    });

    it("ends effects whose held documents are gone", async () => {
      const anchor = doc("Actor.c.ActiveEffect.e", { holds: [hold("Scene.s.Region.gone")] });
      const other = doc("Actor.c.ActiveEffect.o");
      const caster = actor("Actor.c", [anchor, other]);
      (game as any).actors = { contents: [caster] };
      await reconcileSpellAnchors();
      expect(caster.deleteEmbeddedDocuments).toHaveBeenCalledWith("ActiveEffect", ["e"]);
    });

    it("takes an area's effect off a token whose area is gone or that left it", async () => {
      const token = { id: "t" };
      const region = doc("Scene.s.Region.r", {}, { tokens: new Set() });
      const left = doc("Scene.s.Token.t.Actor.a.ActiveEffect.left", { areaRegion: region.uuid });
      const gone = doc("Scene.s.Token.t.Actor.a.ActiveEffect.gone", {
        areaRegion: "Scene.s.Region.gone",
      });
      const tokenActor = actor("Scene.s.Token.t.Actor.a", [left, gone], { isToken: true, token });
      (game as any).scenes.contents = [
        scene([region], [{ actorLink: false, actor: tokenActor, ...doc("Scene.s.Token.t") }]),
      ];
      await reconcileSpellAnchors();
      expect(tokenActor.deleteEmbeddedDocuments).toHaveBeenCalledWith("ActiveEffect", [
        "left",
        "gone",
      ]);

      vi.mocked(tokenActor.deleteEmbeddedDocuments).mockClear();
      region.tokens.add(token);
      documents.set(gone.uuid, gone);
      tokenActor.effects.contents = [left];
      await reconcileSpellAnchors();
      expect(tokenActor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
    });
  });

  describe("hooks", () => {
    let handlers: Record<string, (document: any) => void>;

    beforeEach(() => {
      handlers = {};
      vi.stubGlobal("Hooks", {
        on: (hook: string, fn: (document: any) => void) => (handlers[hook] = fn),
        once: (hook: string, fn: (document: any) => void) => (handlers[hook] = fn),
      });
      initSpellAnchors();
    });

    const settle = () => new Promise((resolve) => setTimeout(resolve));

    it("ends the effect of a deleted held document", async () => {
      const anchor = doc("Actor.c.ActiveEffect.e", { holds: [hold("Scene.s.Region.r")] });
      handlers["deleteRegion"]!(doc("Scene.s.Region.r", { heldBy: anchor.uuid }));
      await settle();
      expect(anchor.delete).toHaveBeenCalledOnce();
    });

    it("deletes what the effects on a deleted caster token held", async () => {
      const region = doc("Scene.s.Region.r", { heldBy: "Scene.s.Token.t.Actor.a.ActiveEffect.e" });
      const other = doc("Scene.s.Region.o", { heldBy: "Scene.s.Token.t2.Actor.a.ActiveEffect.e" });
      (game as any).scenes.contents = [scene([region, other])];
      documents.delete("Scene.s.Token.t");
      handlers["deleteToken"]!({ uuid: "Scene.s.Token.t", getFlag: () => undefined });
      await settle();
      expect(region.delete).toHaveBeenCalledOnce();
      expect(other.delete).not.toHaveBeenCalled();
    });

    it("does nothing on a client that isn't the active GM's", async () => {
      (game as any).users.activeGM.isSelf = false;
      const anchor = doc("Actor.c.ActiveEffect.e");
      handlers["deleteRegion"]!(doc("Scene.s.Region.r", { heldBy: anchor.uuid }));
      await settle();
      expect(anchor.delete).not.toHaveBeenCalled();
    });
  });
});
