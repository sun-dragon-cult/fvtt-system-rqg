import { mockActor as mockActorOriginal } from "../mocks/mockActor";
import { HealingCalculations, type HealingEffects } from "./healingCalculations";
import { applyTestDamage } from "./damageCalculations.test";
import { DamageCalculations } from "./damageCalculations";
import { assertItemType } from "./util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RqgActor } from "../actors/rqgActor";
import { RqgItem } from "../items/rqgItem";

describe("healing", () => {
  let mockActor: RqgActor;
  let mockLeftLeg: RqgItem;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockHead: RqgItem;
  let mockChest: RqgItem;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockAbdomen: RqgItem;

  beforeEach(() => {
    mockActor = JSON.parse(JSON.stringify(mockActorOriginal));
    mockLeftLeg = mockActor.items.find((i) => i.name === "Left Leg")!;
    mockHead = mockActor.items.find((i) => i.name === "Head")!;
    mockChest = mockActor.items.find((i) => i.name === "Chest")!;
    mockAbdomen = mockActor.items.find((i) => i.name === "Abdomen")!;
  });

  it("should be correct for healing smaller wounds", () => {
    // --- Arrange ---
    const healPoints = 2;
    const actorTotalHp = mockActor.system.attributes.hitPoints.value!; // 15

    applyTestDamage(1, true, mockLeftLeg, mockActor);
    applyTestDamage(healPoints, true, mockLeftLeg, mockActor);

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      1,
      mockLeftLeg,
      mockActor,
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [
          1,
          0, // 2-2
        ],
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
    // --- Arrange ---
    const healPoints = 6;

    applyTestDamage(33, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("severed");
    expect(mockLeftLeg.system.wounds).toStrictEqual([10]);

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLeg,
      mockActor,
    );

    // --- Assert ---
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
    // --- Arrange ---
    const healPoints = 5;

    applyTestDamage(33, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("severed");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLeg,
      mockActor,
    );

    // --- Assert ---
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
    // --- Arrange ---
    const chestDamage = 2;
    const legDamage = 3;
    const actorTotalHp = mockActor.system.attributes.hitPoints.value!; // 15

    applyTestDamage(chestDamage, true, mockChest, mockActor);
    applyTestDamage(legDamage, true, mockLeftLeg, mockActor);
    expect(mockActor.system.attributes.health).toBe("wounded");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      chestDamage + 10,
      0,
      mockChest,
      mockActor,
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "healthy",
        hitLocationHealthState: "healthy",
        wounds: [0], // chestDamage - chestDamage
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
    // TODO handle multiple hit locations causing shock

    // --- Arrange ---
    const healPoints = 1;
    const chestHP = mockChest.system.hitPoints.max!; // 6

    applyTestDamage(chestHP, true, mockChest, mockActor);
    expect(mockActor.system.attributes.health).toBe("shock");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockChest,
      mockActor,
    );

    // --- Assert ---
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
    // --- Arrange ---
    const legDamage = mockLeftLeg.system.hitPoints.max!; // 5
    const actorTotalHp = mockActor.system.attributes.hitPoints.value!; // 15

    applyTestDamage(legDamage, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.system.hitLocationHealthState).toBe("useless");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      1,
      0,
      mockLeftLeg,
      mockActor,
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      system: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [legDamage - 1], // chestDamage - chestDamage
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
});

export function applyTestHealing(
  healPoints: number,
  healWoundIndex: number,
  hitLocation: RqgItem,
  actor: RqgActor,
): HealingEffects {
  assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);
  const healingEffects = HealingCalculations.healWound(
    healPoints,
    healWoundIndex,
    hitLocation,
    actor,
  );
  foundry.utils.mergeObject(hitLocation, healingEffects.hitLocationUpdates);
  foundry.utils.mergeObject(actor, healingEffects.actorUpdates);
  actor.system.attributes.health = DamageCalculations.getCombinedActorHealth(actor);
  hitLocation.system.hitPoints.value =
    hitLocation.system.hitPoints.max! -
    hitLocation.system.wounds.reduce((acc: number, val: number) => acc + val, 0);
  return healingEffects;
}
