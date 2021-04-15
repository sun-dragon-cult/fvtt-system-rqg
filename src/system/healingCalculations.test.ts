import { mockActor } from "../mocks/mockActor";
import { mockAbdomen, mockChest, mockHead, mockLeftLeg } from "../mocks/mockHitLocation";
import { HealingCalculations, HealingEffects } from "./healingCalculations";
import { applyTestDamage } from "./damageCalculations.test";
import { HitLocationItemData } from "../data-model/item-data/hitLocationData";
import { CharacterActorData, RqgActorData } from "../data-model/actor-data/rqgActorData";
import { DamageCalculations } from "./damageCalculations";

describe("healing", () => {
  let mockLeftLegInstance: HitLocationItemData;
  let mockHeadInstance: HitLocationItemData;
  let mockChestInstance: HitLocationItemData;
  let mockAbdomenInstance: HitLocationItemData;
  let mockActorInstance: RqgActorData;

  beforeEach(() => {
    mockLeftLegInstance = JSON.parse(JSON.stringify(mockLeftLeg));
    mockHeadInstance = JSON.parse(JSON.stringify(mockHead));
    mockChestInstance = JSON.parse(JSON.stringify(mockChest));
    mockAbdomenInstance = JSON.parse(JSON.stringify(mockAbdomen));
    mockActorInstance = JSON.parse(JSON.stringify(mockActor));
  });

  it("should be correct for healing smaller wounds", () => {
    // --- Arrange ---
    const healPoints = 2;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(1, true, mockLeftLegInstance, mockActorInstance);
    applyTestDamage(healPoints, true, mockLeftLegInstance, mockActorInstance);

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, removeTokenEffects, usefulLegs } = applyTestHealing(
      healPoints,
      1,
      mockLeftLegInstance,
      mockActorInstance
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
        wounds: [
          1,
          0, // 2-2
        ],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          health: "wounded",
          hitPoints: {
            value: actorTotalHp - 1,
          },
        },
      },
    });
    expect(removeTokenEffects).toStrictEqual([]);
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should heal severed limb when healing more than 6 points", () => {
    // --- Arrange ---
    const healPoints = 6;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(33, true, mockLeftLegInstance, mockActorInstance);
    expect(mockLeftLegInstance.data.limbHealthState).toBe("severed");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, removeTokenEffects, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLegInstance,
      mockActorInstance
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
        wounds: [4],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          health: "wounded",
          hitPoints: {
            value: 11,
          },
        },
      },
    });
    expect(removeTokenEffects).toStrictEqual([]);
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should not heal severed limb when healing less than 6 points", () => {
    // --- Arrange ---
    const healPoints = 5;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(33, true, mockLeftLegInstance, mockActorInstance);
    expect(mockLeftLegInstance.data.limbHealthState).toBe("severed");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, removeTokenEffects, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLegInstance,
      mockActorInstance
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "severed",
        wounds: [5],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          health: "wounded",
          hitPoints: {
            value: 10,
          },
        },
      },
    });
    expect(removeTokenEffects).toStrictEqual([]);
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should not heal more than the wound", () => {
    // --- Arrange ---
    const chestDamage = 2;
    const legDamage = 3;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(chestDamage, true, mockChestInstance, mockActorInstance);
    applyTestDamage(legDamage, true, mockLeftLegInstance, mockActorInstance);
    expect(mockActorInstance.data.attributes.health).toBe("wounded");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, removeTokenEffects, usefulLegs } = applyTestHealing(
      chestDamage + 10,
      0,
      mockChestInstance,
      mockActorInstance
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "healthy",
        wounds: [0], // chestDamage - chestDamage
      },
    });
    mockActorInstance.data.attributes.health = DamageCalculations.getCombinedActorHealth(
      mockActorInstance
    );
    expect(mockActorInstance.data.attributes.health).toBe("wounded");
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          hitPoints: {
            value: actorTotalHp - legDamage,
          },
        },
      },
    });
    expect(removeTokenEffects).toStrictEqual([]);
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should bring an actor out of shock when hitlocation HP > 0", () => {
    // TODO handle multiple hit locations causing shock

    // --- Arrange ---
    const healPoints = 1;
    const chestHP = mockChestInstance.data.hp.max!; // 6
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { addTokenEffects: preEffect } = applyTestDamage(
      chestHP,
      true,
      mockChestInstance,
      mockActorInstance
    );
    expect(mockActorInstance.data.attributes.health).toBe("shock");
    expect(preEffect).toStrictEqual(["icons/svg/lightning.svg"]);

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, removeTokenEffects, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockChestInstance,
      mockActorInstance
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
        wounds: [5],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          health: "wounded",
          hitPoints: {
            value: 10,
          },
        },
      },
    });
    expect(removeTokenEffects).toStrictEqual(["icons/svg/lightning.svg"]);
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should remove 'useless' state from limb when HP > 0", () => {
    // --- Arrange ---
    const legDamage = mockLeftLegInstance.data.hp.max!; // 5
    const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value!; // 15

    applyTestDamage(legDamage, true, mockLeftLegInstance, mockActorInstance);
    expect(mockLeftLegInstance.data.limbHealthState).toBe("useless");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, removeTokenEffects, usefulLegs } = applyTestHealing(
      1,
      0,
      mockLeftLegInstance,
      mockActorInstance
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
        wounds: [legDamage - 1], // chestDamage - chestDamage
      },
    });
    mockActorInstance.data.attributes.health = DamageCalculations.getCombinedActorHealth(
      mockActorInstance
    );
    expect(mockActorInstance.data.attributes.health).toBe("wounded");
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          health: "wounded",
          hitPoints: {
            value: actorTotalHp - legDamage + 1,
          },
        },
      },
    });
    expect(removeTokenEffects).toStrictEqual([]);
    expect(usefulLegs).toStrictEqual([]);
  });
});

export function applyTestHealing(
  healPoints: number,
  healWoundIndex: number,
  hitLocationData: HitLocationItemData,
  actorData: CharacterActorData
): HealingEffects {
  const healingEffects = HealingCalculations.healWound(
    healPoints,
    healWoundIndex,
    hitLocationData,
    actorData
  );
  mergeObject(hitLocationData, healingEffects.hitLocationUpdates);
  mergeObject(actorData, healingEffects.actorUpdates); // FIXME Remove - don't add!!! *** *** *** *** *** mergeObject({k1: "v1", k2: "v2"}, {"-=k1": null});   // {k2: "v2"}
  actorData.data.attributes.health = DamageCalculations.getCombinedActorHealth(actorData);
  return healingEffects;
}
