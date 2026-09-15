import { describe, expect, it } from "vitest";
import { resolveRoutedTarget } from "./resolve-routed-target";
import type { RoutedTargetActorLike, RoutedTargetItemLike } from "./routed-key.types";

const item = (id: string): RoutedTargetItemLike => ({ id });

function fakeActor(overrides: Partial<RoutedTargetActorLike> = {}): RoutedTargetActorLike {
  return {
    getBestEmbeddedDocumentByRqid: () => undefined,
    getEmbeddedDocumentsByRqidRegex: () => [],
    ...overrides,
  };
}

describe("resolveRoutedTarget", () => {
  describe("item-local", () => {
    it("resolves to the owning item", () => {
      const owningItem = item("weapon-1");
      expect(resolveRoutedTarget({ kind: "item-local" }, { owningItem })).toEqual({
        items: [owningItem],
      });
    });

    it("errors when the effect is not on an item", () => {
      expect(resolveRoutedTarget({ kind: "item-local" }, {})).toEqual({
        error: { reason: "item-local-outside-item" },
      });
    });
  });

  describe("rqid", () => {
    it("resolves to the single best match", () => {
      const best = item("skill-dodge");
      const actor = fakeActor({ getBestEmbeddedDocumentByRqid: () => best });
      expect(
        resolveRoutedTarget({ kind: "rqid", rqid: "i.skill.dodge" }, { targetActor: actor }),
      ).toEqual({ items: [best] });
    });

    it("errors with no-match when nothing matches", () => {
      expect(
        resolveRoutedTarget({ kind: "rqid", rqid: "i.skill.dodge" }, { targetActor: fakeActor() }),
      ).toEqual({ error: { reason: "no-match", detail: { selector: "@i.skill.dodge" } } });
    });

    it("errors with no-match when there is no actor context", () => {
      expect(resolveRoutedTarget({ kind: "rqid", rqid: "i.skill.dodge" }, {})).toMatchObject({
        error: { reason: "no-match" },
      });
    });
  });

  describe("regex", () => {
    it("resolves to every match, sorted by id for deterministic fan-out", () => {
      const actor = fakeActor({
        getEmbeddedDocumentsByRqidRegex: () => [item("loc-c"), item("loc-a"), item("loc-b")],
      });
      const result = resolveRoutedTarget(
        { kind: "regex", pattern: "i\\.hit-location" },
        { targetActor: actor },
      );
      expect(result).toEqual({ items: [item("loc-a"), item("loc-b"), item("loc-c")] });
    });

    it("errors with no-match when the pattern matches nothing", () => {
      expect(
        resolveRoutedTarget({ kind: "regex", pattern: "i\\.nope" }, { targetActor: fakeActor() }),
      ).toEqual({ error: { reason: "no-match", detail: { selector: "@~i\\.nope" } } });
    });
  });
});
