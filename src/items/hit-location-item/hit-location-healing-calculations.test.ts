import { mockActor as mockActorOriginal } from "../../../test/mocks/mockActor.ts";
import { HealingCalculations } from "./hit-location-healing-calculations";
import { applyTestDamage, applyTestHealing } from "./hit-location-test-helpers";
import { DamageCalculations } from "./hit-location-damage-calculations";
import { assertDocumentSubType } from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { RqgActor } from "../../actors/rqg-actor";
import { RqgItem } from "../rqg-item";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { describe, it, expect, beforeEach } from "vitest";

describe("HealingCalculations", () => {
  let mockActor: CharacterActor;
  let mockLeftLeg: HitLocationItem;
  let mockRightLeg: HitLocationItem;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockHead: HitLocationItem;
  let mockChest: HitLocationItem;
  let mockAbdomen: HitLocationItem;

  beforeEach(() => {
    mockActor = JSON.parse(JSON.stringify(mockActorOriginal));
    mockLeftLeg = mockActor.items.find((i) => i.name === "Left Leg")! as HitLocationItem;
    mockRightLeg = mockActor.items.find((i) => i.name === "Right Leg")! as HitLocationItem;
    mockHead = mockActor.items.find((i) => i.name === "Head")! as HitLocationItem;
    mockChest = mockActor.items.find((i) => i.name === "Chest")! as HitLocationItem;
    mockAbdomen = mockActor.items.find((i) => i.name === "Abdomen")! as HitLocationItem;
  });

  it("should be correct for healing smaller wounds", () => {
    const healPoints = 2;
    const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

    applyTestDamage(1, true, mockLeftLeg, mockActor);
    applyTestDamage(healPoints, true, mockLeftLeg, mockActor);

    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      1,
      mockLeftLeg,
      mockActor,
    );

    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [1],
      },
    });
    expect(actorUpdates).toStrictEqual({
      system: {
        attributes: {
          hitPoints: {
            value: actorTotalHp - 1,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should heal severed limb when healing more than 6 points", () => {
    const healPoints = 6;

    applyTestDamage(33, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("severed");
    expect(mockLeftLeg.system.wounds).toStrictEqual([10]);

    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLeg,
      mockActor,
    );

    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [4],
      },
    });
    expect(actorUpdates).toStrictEqual({
      system: {
        attributes: {
          hitPoints: {
            value: 11,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should not heal severed limb when healing less than 6 points", () => {
    const healPoints = 5;

    applyTestDamage(33, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("severed");

    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLeg,
      mockActor,
    );

    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "shock",
        hitLocationHealthState: "severed",
        wounds: [5],
      },
    });
    expect(actorUpdates).toStrictEqual({
      system: {
        attributes: {
          hitPoints: {
            value: 10,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should not heal more than the wound", () => {
    const chestDamage = 2;
    const legDamage = 3;
    const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

    applyTestDamage(chestDamage, true, mockChest, mockActor);
    applyTestDamage(legDamage, true, mockLeftLeg, mockActor);
    expect(mockActor.system.attributes.health).toBe("wounded");

    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      chestDamage + 10,
      0,
      mockChest,
      mockActor,
    );

    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "healthy",
        hitLocationHealthState: "healthy",
        wounds: [],
      },
    });
    mockActor.system.attributes.health = DamageCalculations.getCombinedActorHealth(mockActor);
    expect(mockActor.system.attributes.health).toBe("wounded");
    expect(actorUpdates).toStrictEqual({
      system: {
        attributes: {
          hitPoints: {
            value: actorTotalHp - legDamage,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should bring an actor out of shock when hitlocation HP > 0", () => {
    assertDocumentSubType<CharacterActor>(mockActor, ActorTypeEnum.Character);
    assertDocumentSubType<HitLocationItem>(mockChest, ItemTypeEnum.HitLocation);

    const healPoints = 1;
    const chestHP = mockChest.system.hitPoints.max!;

    applyTestDamage(chestHP, true, mockChest, mockActor);
    expect(mockActor.system.attributes.health).toBe("shock");

    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockChest,
      mockActor,
    );

    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [5],
      },
    });
    expect(actorUpdates).toStrictEqual({
      system: {
        attributes: {
          hitPoints: {
            value: 10,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should remove 'useless' state from limb when HP > 0", () => {
    assertDocumentSubType<CharacterActor>(mockActor, ActorTypeEnum.Character);
    assertDocumentSubType<HitLocationItem>(mockLeftLeg, ItemTypeEnum.HitLocation);
    const legDamage = mockLeftLeg.system.hitPoints.max!;
    const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

    applyTestDamage(legDamage, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("useless");

    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      1,
      0,
      mockLeftLeg,
      mockActor,
    );

    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [legDamage - 1],
      },
    });
    mockActor.system.attributes.health = DamageCalculations.getCombinedActorHealth(mockActor);
    expect(mockActor.system.attributes.health).toBe("wounded");
    expect(actorUpdates).toStrictEqual({
      system: {
        attributes: {
          hitPoints: {
            value: actorTotalHp - legDamage + 1,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should restore useless legs when the abdomen wound causing them heals below threshold", () => {
    const appliedDamage = mockAbdomen.system.hitPoints.max!;

    applyTestDamage(appliedDamage, true, mockAbdomen, mockActor);
    // Simulate the connected legs having been made useless by the abdomen wound.
    mockLeftLeg.system.hitLocationHealthState = "useless";
    mockRightLeg.system.hitLocationHealthState = "useless";

    const { usefulLegs } = applyTestHealing(appliedDamage, 0, mockAbdomen, mockActor);

    expect(usefulLegs).toStrictEqual([
      {
        _id: "Dhm40qEh3Idp5HSE",
        system: { hitLocationHealthState: "healthy" },
      },
      {
        _id: "RFt7m9xXHtjpVNeY",
        system: { hitLocationHealthState: "healthy" },
      },
    ]);
  });

  it("should not restore a leg that is independently useless from its own damage", () => {
    const appliedDamage = mockAbdomen.system.hitPoints.max!;

    applyTestDamage(appliedDamage, true, mockAbdomen, mockActor);
    applyTestDamage(mockLeftLeg.system.hitPoints.max!, true, mockLeftLeg, mockActor);
    mockRightLeg.system.hitLocationHealthState = "useless";
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("useless");

    const { usefulLegs } = applyTestHealing(appliedDamage, 0, mockAbdomen, mockActor);

    expect(usefulLegs).toStrictEqual([
      {
        _id: "RFt7m9xXHtjpVNeY",
        system: { hitLocationHealthState: "healthy" },
      },
    ]);
  });

  it("throws when trying to heal a missing wound", () => {
    expect(() =>
      HealingCalculations.healWound(
        1,
        99,
        mockLeftLeg as unknown as RqgItem,
        mockActor as unknown as RqgActor,
      ),
    ).toThrow();
  });
});
