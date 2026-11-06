import { afterEach, describe, expect, it } from "vitest";
import type { MigrationLogEntry } from "./apply-migrations";
import { resolveActorName, resolveMigrationSource } from "./migrate-world";

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
});
