import { afterEach, describe, expect, it } from "vitest";
import type { MigrationLogEntry } from "./apply-migrations";
import { resolveActorName, resolveActorUuid, resolveMigrationSource } from "./migrate-world";

const sceneUuid = "Scene.9ofv1FvTsz8cSIZM";
const itemUuid = `${sceneUuid}.Token.tok1.Actor.act1.Item.item1`;

const entry = (documents: MigrationLogEntry["documents"]): MigrationLogEntry => ({
  level: "info",
  message: "test",
  documents,
});

describe("migration report grouping", () => {
  const originalScenes = game.scenes;
  afterEach(() => {
    (game as { scenes?: unknown }).scenes = originalScenes;
  });

  it("puts a scene document and a uuid inside the same scene in one group", () => {
    const fromScene = resolveMigrationSource(
      entry([{ kind: "Scene", uuid: sceneUuid, label: "New Scene (2)" }]),
    );
    const fromItem = resolveMigrationSource(
      entry([{ kind: "Item", uuid: itemUuid, label: "Ring" }]),
    );
    expect(fromItem.groupKey).toBe(fromScene.groupKey);
  });

  it("falls back to the scene name when the scene has no uuid", () => {
    const first = resolveMigrationSource(entry([{ kind: "Scene", uuid: "", label: "One" }]));
    const second = resolveMigrationSource(entry([{ kind: "Scene", uuid: "", label: "Two" }]));
    expect(first.groupKey).not.toBe(second.groupKey);
  });

  it("names the token actor for an embedded item uuid", () => {
    (game as { scenes?: unknown }).scenes = {
      get: () => ({ tokens: { get: () => ({ actor: { name: "Guard" } }) } }),
    };
    expect(resolveActorName(entry([{ kind: "Item", uuid: itemUuid, label: "Ring" }]))).toBe(
      "Guard",
    );
  });

  it("tells actors with the same name apart by uuid, also from their items", () => {
    const actor = resolveActorUuid(entry([{ kind: "Actor", uuid: "Actor.aaa", label: "Dismas" }]));
    const item = resolveActorUuid(
      entry([{ kind: "Item", uuid: "Actor.aaa.Item.i1", label: "Staff" }]),
    );
    const other = resolveActorUuid(entry([{ kind: "Actor", uuid: "Actor.bbb", label: "Dismas" }]));
    expect(item).toBe(actor);
    expect(other).not.toBe(actor);
  });

  it("uses the token actor uuid for a token actor's items", () => {
    expect(resolveActorUuid(entry([{ kind: "Item", uuid: itemUuid, label: "Ring" }]))).toBe(
      `${sceneUuid}.Token.tok1.Actor.act1`,
    );
  });

  it("keys compendium actors by uuid and prefers the actor document", () => {
    expect(
      resolveActorUuid(
        entry([
          { kind: "Item", uuid: "Compendium.rqg.bestiary.Actor.aaa.Item.i1", label: "Staff" },
        ]),
      ),
    ).toBe("Compendium.rqg.bestiary.Actor.aaa");
    expect(
      resolveActorUuid(
        entry([
          { kind: "Item", uuid: "Actor.bbb.Item.i1", label: "Staff" },
          { kind: "Actor", uuid: "Actor.aaa", label: "Dismas" },
        ]),
      ),
    ).toBe("Actor.aaa");
  });
});
