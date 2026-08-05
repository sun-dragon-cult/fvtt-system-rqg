import { describe, it, expect, beforeEach } from "vitest";
import { migrateHitLocationConnectedToAndType } from "./migrate-hit-location-connected-to-and-type";
import { mockActor as mockActorOriginal } from "../../../../test/mocks/mockActor.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { MigrationLogger } from "../../logging/migration-logger.ts";

function makeHitLocationItem(rqid: string, hitLocationType: string, connectedTo = "") {
  return {
    type: "hitLocation",
    name: "Test Location",
    flags: {
      rqg: {
        documentRqidFlags: { id: rqid },
      },
    },
    system: {
      hitLocationType,
      connectedTo,
    },
  };
}

function makeActor(bodyType: string, items: unknown[] = []) {
  return {
    type: "character",
    items,
    getBodyType: () => bodyType,
  };
}

describe("migrateHitLocationConnectedToAndType", () => {
  describe("humanoid actors - fixed directly from the item's own rqid", () => {
    it("fills in an invalid hitLocationType from the canonical table", async () => {
      const item = makeHitLocationItem("i.hit-location.abdomen", "");
      const actor = makeActor("humanoid");

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({ system: { hitLocationType: "abdomen" } });
    });

    it("overwrites an already-valid-but-wrong hitLocationType with the canonical value", async () => {
      const item = makeHitLocationItem("i.hit-location.abdomen", "limb");
      const actor = makeActor("humanoid");

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({ system: { hitLocationType: "abdomen" } });
    });

    it("leaves hitLocationType alone when it already matches the canonical value", async () => {
      const item = makeHitLocationItem("i.hit-location.abdomen", "abdomen");
      const actor = makeActor("humanoid");

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({});
    });

    it("overwrites an already-valid-but-wrong connectedTo with the canonical value", async () => {
      const item = makeHitLocationItem("i.hit-location.right-leg", "limb", "i.hit-location.chest");
      const actor = makeActor("humanoid", []);

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({ system: { connectedTo: "i.hit-location.abdomen" } });
    });

    it("leaves connectedTo alone when it already matches the canonical value", async () => {
      const item = makeHitLocationItem(
        "i.hit-location.right-leg",
        "limb",
        "i.hit-location.abdomen",
      );
      const actor = makeActor("humanoid", []);

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({});
    });

    it("fixes connectedTo directly from the canonical table, without needing a sibling", async () => {
      const item = makeHitLocationItem("i.hit-location.right-leg", "limb", "Right Leg");
      const actor = makeActor("humanoid", []);

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({ system: { connectedTo: "i.hit-location.abdomen" } });
    });

    it("fixes both fields together when both are invalid", async () => {
      const item = makeHitLocationItem("i.hit-location.left-arm", "", "Left Arm");
      const actor = makeActor("humanoid", []);

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({
        system: { hitLocationType: "limb", connectedTo: "i.hit-location.chest" },
      });
    });

    it("does not guess hitLocationType for a non-canonical rqid", async () => {
      const item = makeHitLocationItem("i.hit-location.tail", "");
      const actor = makeActor("humanoid");

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({});
    });
  });

  describe("non-humanoid actors", () => {
    it("never guesses hitLocationType", async () => {
      const item = makeHitLocationItem("i.hit-location.abdomen", "");
      const actor = makeActor("other");

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({});
    });

    it("falls back to resolving connectedTo by sibling name", async () => {
      const abdomen = makeHitLocationItem("i.hit-location.abdomen", "abdomen");
      const item = makeHitLocationItem("i.hit-location.left-leg", "limb", "Test Location Abdomen");
      // Sibling must be named exactly what the legacy connectedTo value holds.
      abdomen.name = "Test Location Abdomen";
      const actor = makeActor("other", [abdomen]);

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
      );

      expect(updateData).toStrictEqual({ system: { connectedTo: "i.hit-location.abdomen" } });
    });

    it("warns and does nothing when connectedTo matches no sibling by name", async () => {
      const item = makeHitLocationItem("i.hit-location.left-leg", "limb", "Some Unknown Location");
      const actor = makeActor("other", []);
      const warnings: string[] = [];
      const logger = { warn: (msg: string) => warnings.push(msg) } as unknown as MigrationLogger;

      const updateData = await migrateHitLocationConnectedToAndType(
        item as unknown as RqgItem,
        actor as unknown as RqgActor,
        logger,
      );

      expect(updateData).toStrictEqual({});
      expect(warnings).toHaveLength(1);
    });
  });

  describe("with the real mock actor fixture", () => {
    let mockActor: RqgActor;
    let mockLeftLeg: HitLocationItem;

    beforeEach(() => {
      mockActor = JSON.parse(JSON.stringify(mockActorOriginal));
      // JSON round-tripping drops class methods - the mock actor's hit locations are exactly
      // the canonical 7, so stub getBodyType() the way the real RqgActor would resolve it.
      (mockActor as unknown as { getBodyType: () => string }).getBodyType = () => "humanoid";
      mockLeftLeg = mockActor.items.find((i) => i.name === "Left Leg")! as HitLocationItem;
    });

    it("resolves a legacy name-based connectedTo via the canonical table (mock actor is humanoid)", async () => {
      mockLeftLeg.system.connectedTo = "Abdomen";

      const updateData = await migrateHitLocationConnectedToAndType(
        mockLeftLeg as unknown as RqgItem,
        mockActor,
      );

      expect(updateData).toStrictEqual({ system: { connectedTo: "i.hit-location.abdomen" } });
    });

    it("does nothing when connectedTo is already a valid rqid", async () => {
      mockLeftLeg.system.connectedTo = "i.hit-location.abdomen";

      const updateData = await migrateHitLocationConnectedToAndType(
        mockLeftLeg as unknown as RqgItem,
        mockActor,
      );

      expect(updateData).toStrictEqual({});
    });

    it("overwrites a valid-but-wrong rqid connectedTo (leg mistakenly connected to the chest)", async () => {
      mockLeftLeg.system.connectedTo = "i.hit-location.chest";

      const updateData = await migrateHitLocationConnectedToAndType(
        mockLeftLeg as unknown as RqgItem,
        mockActor,
      );

      expect(updateData).toStrictEqual({ system: { connectedTo: "i.hit-location.abdomen" } });
    });
  });

  it("skips non-hitLocation items", async () => {
    const item = { type: "skill", system: {} };
    const actor = makeActor("humanoid");

    const updateData = await migrateHitLocationConnectedToAndType(
      item as unknown as RqgItem,
      actor as unknown as RqgActor,
    );

    expect(updateData).toStrictEqual({});
  });

  it("does nothing when there is no owning actor", async () => {
    const item = makeHitLocationItem("i.hit-location.abdomen", "", "Abdomen");

    const updateData = await migrateHitLocationConnectedToAndType(item as unknown as RqgItem);

    expect(updateData).toStrictEqual({});
  });

  it("does not warn about an already-correct connectedTo on a standalone item with no owning actor", async () => {
    // Reproduces compendium library packs of hit locations (e.g. a "hit-locations-humanoids"
    // Item pack) that aren't embedded in any Actor - connectedTo is already a well-formed rqid,
    // but there's no sibling to validate it against, so it must be left alone silently rather
    // than flagged as broken.
    const item = makeHitLocationItem("i.hit-location.left-arm", "limb", "i.hit-location.chest");
    const warnings: string[] = [];
    const logger = { warn: (msg: string) => warnings.push(msg) } as unknown as MigrationLogger;

    const updateData = await migrateHitLocationConnectedToAndType(
      item as unknown as RqgItem,
      undefined,
      logger,
    );

    expect(updateData).toStrictEqual({});
    expect(warnings).toHaveLength(0);
  });
});
