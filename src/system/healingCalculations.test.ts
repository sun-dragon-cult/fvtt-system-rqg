import { mockActor as mockActorOriginal } from "../mocks/mockActor";
import { HealingCalculations, HealingEffects } from "./healingCalculations";
import { applyTestDamage } from "./damageCalculations.test";
import { HitLocationItemData } from "../data-model/item-data/hitLocationData";
import { CharacterActorData, RqgActorData } from "../data-model/actor-data/rqgActorData";
import { DamageCalculations } from "./damageCalculations";

describe("healing", () => {
  let mockActor: RqgActorData;
  let mockLeftLeg: HitLocationItemData;
  let mockHead: HitLocationItemData;
  let mockChest: HitLocationItemData;
  let mockAbdomen: HitLocationItemData;

  beforeEach(() => {
    mockActor = JSON.parse(JSON.stringify(mockActorOriginal));
    mockLeftLeg = mockActor.items.find((i: any) => i.name === "leftLeg") as HitLocationItemData;
    mockHead = mockActor.items.find((i: any) => i.name === "head") as HitLocationItemData;
    mockChest = mockActor.items.find((i: any) => i.name === "chest") as HitLocationItemData;
    mockAbdomen = mockActor.items.find((i: any) => i.name === "abdomen") as HitLocationItemData;
  });

  it("should be correct for healing smaller wounds", () => {
    // --- Arrange ---
    const healPoints = 2;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value!; // 15

    applyTestDamage(1, true, mockLeftLeg, mockActor);
    applyTestDamage(healPoints, true, mockLeftLeg, mockActor);

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      1,
      mockLeftLeg,
      mockActor
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [
          1,
          0, // 2-2
        ],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
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
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(33, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.data.hitLocationHealthState).toBe("severed");
    expect(mockLeftLeg.data.wounds).toStrictEqual([4]);

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLeg,
      mockActor
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        actorHealthImpact: "healthy",
        hitLocationHealthState: "healthy",
        wounds: [0],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          hitPoints: {
            value: 15,
          },
        },
      },
    });
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should not heal severed limb when healing less than 6 points", () => {
    // --- Arrange ---
    const healPoints = 5;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(33, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.data.hitLocationHealthState).toBe("severed");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockLeftLeg,
      mockActor
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        actorHealthImpact: "healthy",
        hitLocationHealthState: "severed",
        wounds: [0],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          hitPoints: {
            value: 15,
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
    const actorTotalHp = mockActor.data.attributes.hitPoints.value!; // 15

    applyTestDamage(chestDamage, true, mockChest, mockActor);
    applyTestDamage(legDamage, true, mockLeftLeg, mockActor);
    expect(mockActor.data.attributes.health).toBe("wounded");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      chestDamage + 10,
      0,
      mockChest,
      mockActor
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        actorHealthImpact: "healthy",
        hitLocationHealthState: "healthy",
        wounds: [0], // chestDamage - chestDamage
      },
    });
    mockActor.data.attributes.health = DamageCalculations.getCombinedActorHealth(mockActor);
    expect(mockActor.data.attributes.health).toBe("wounded");
    expect(actorUpdates).toStrictEqual({
      data: {
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
    const chestHP = mockChest.data.hp.max!; // 6
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    applyTestDamage(chestHP, true, mockChest, mockActor);
    expect(mockActor.data.attributes.health).toBe("shock");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      healPoints,
      0,
      mockChest,
      mockActor
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [2],
      },
    });
    expect(actorUpdates).toStrictEqual({
      data: {
        attributes: {
          hitPoints: {
            value: 13,
          },
        },
      },
    });
    // expect(removeTokenEffects).toStrictEqual(["icons/svg/lightning.svg"]);
    expect(usefulLegs).toStrictEqual([]);
  });

  it("should remove 'useless' state from limb when HP > 0", () => {
    // --- Arrange ---
    const legDamage = mockLeftLeg.data.hp.max!; // 5
    const actorTotalHp = mockActor.data.attributes.hitPoints.value!; // 15

    applyTestDamage(legDamage, true, mockLeftLeg, mockActor);
    expect(mockLeftLeg.data.hitLocationHealthState).toBe("useless");

    // --- Act ---
    const { hitLocationUpdates, actorUpdates, usefulLegs } = applyTestHealing(
      1,
      0,
      mockLeftLeg,
      mockActor
    );

    // --- Assert ---
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
        wounds: [legDamage - 1], // chestDamage - chestDamage
      },
    });
    mockActor.data.attributes.health = DamageCalculations.getCombinedActorHealth(mockActor);
    expect(mockActor.data.attributes.health).toBe("wounded");
    expect(actorUpdates).toStrictEqual({
      data: {
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
  mergeObject(actorData, healingEffects.actorUpdates);
  actorData.data.attributes.health = DamageCalculations.getCombinedActorHealth(actorData);
  hitLocationData.data.hp.value =
    hitLocationData.data.hp.max! - hitLocationData.data.wounds.reduce((acc, val) => acc + val, 0);
  return healingEffects;
}
