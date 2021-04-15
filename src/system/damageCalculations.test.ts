import { mockLeftLeg, mockHead, mockChest, mockAbdomen } from "../mocks/mockHitLocation";
import { DamageCalculations } from "./damageCalculations";
import { mockActor } from "../mocks/mockActor";
import { HitLocationItemData } from "../data-model/item-data/hitLocationData";
import { CharacterActorData } from "../data-model/actor-data/rqgActorData";

describe("Inflict Damage", () => {
  let mockLeftLegInstance: HitLocationItemData;
  let mockHeadInstance: HitLocationItemData;
  let mockChestInstance: HitLocationItemData;
  let mockAbdomenInstance: HitLocationItemData;
  let mockActorInstance: any;

  beforeEach(() => {
    mockLeftLegInstance = JSON.parse(JSON.stringify(mockLeftLeg));
    mockHeadInstance = JSON.parse(JSON.stringify(mockHead));
    mockChestInstance = JSON.parse(JSON.stringify(mockChest));
    mockAbdomenInstance = JSON.parse(JSON.stringify(mockAbdomen));
    mockActorInstance = JSON.parse(JSON.stringify(mockActor));
  });

  describe("Limb Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = 2;
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockLeftLegInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            // health: "wounded", // TODO this is added by the actorSheet itself for now
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual([]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should make limb useless", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLegInstance.data.hp.max!; // 5
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockLeftLegInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "useless",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummys leftLeg is useless and cannot hold anything / support standing. You can fight with whatever limbs are still functional."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual([]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it("should be maxed out to 2*Limb HP", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLegInstance.data.hp.max! * 2; // 10
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockLeftLegInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "useless",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummy is functionally incapacitated: you can no longer fight until healed and am in shock. You may try to heal yourself."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "shock",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/lightning.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 3 * HP should severe the limb", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLegInstance.data.hp.max! * 3; // 15
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15
      const maxDamage = mockLeftLegInstance.data.hp.max! * 2; // Limbs can't take more damage

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockLeftLegInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "severed",
          wounds: [maxDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummys leftLeg is severed or irrevocably maimed. Only a 6 point heal applied within ten minutes can restore a severed limb, assuming all parts are available."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "shock",
            hitPoints: {
              value: actorTotalHp - maxDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/lightning.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it("should not be affected by more damage if previously severed", () => {
      // --- Arrange --- (Sever arm)
      applyTestDamage(222, true, mockLeftLegInstance, mockActorInstance);
      const appliedDamage = 3;

      // --- Act --- (Try to hit the same arm again)
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockLeftLegInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({});
      expect(actorUpdates).toStrictEqual({});
      expect(notification).toBe(
        "leftLeg is gone and cannot be hit anymore, reroll to get a new hit location!"
      );
      expect(addTokenEffects).toStrictEqual([]);
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Head Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = 2;
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockHeadInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            // health: "wounded", // TODO this is added by the actorSheet itself for now
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual([]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockHeadInstance.data.hp.max!; // 10
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockHeadInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummy is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die"
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "unconscious",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/unconscious.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockHeadInstance.data.hp.max! * 2; // 10
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockHeadInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummy becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "unconscious",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/unconscious.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 3*HP kills the actor", () => {
      // --- Arrange ---
      const appliedDamage = mockHeadInstance.data.hp.max! * 3; // 15
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockHeadInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Crash Test Dummy dies instantly.");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "dead",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/skull.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Chest Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = 5;
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockChestInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            // health: "wounded", // TODO this is added by the actorSheet itself for now
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual([]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should put actor in shock", () => {
      // --- Arrange ---
      const appliedDamage = mockChestInstance.data.hp.max!; // 6
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockChestInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummy falls and is too busy coughing blood to do anything. Will bleed to death in ten minutes unless the bleeding is stopped by First Aid, and cannot take any action, including healing."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "shock",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/lightning.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockChestInstance.data.hp.max! * 2; // 12
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockChestInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummy becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "unconscious",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/unconscious.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 3*HP kills the actor", () => {
      // --- Arrange ---
      const appliedDamage = mockChestInstance.data.hp.max! * 3; // 18
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockChestInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Crash Test Dummy dies instantly.");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "dead",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/skull.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Abdomen Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = 3;
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockAbdomenInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates.data.wounds).toStrictEqual([appliedDamage]);
      expect(hitLocationUpdates.data.hitLocationHealthState).toBe("wounded");
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            // health: "wounded", // TODO this is added by the actorSheet itself for now
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual([]);
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should make actor fall", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomenInstance.data.hp.max!;
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockAbdomenInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates.data.wounds).toStrictEqual([appliedDamage]);
      expect(hitLocationUpdates.data.hitLocationHealthState).toBe("wounded");
      expect(notification).toBe(
        "Both legs are useless and Crash Test Dummy falls to the ground. Crash Test Dummy may fight from the ground in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            // health: "wounded", // TODO this is added by the actorSheet itself for now
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/falling.svg"]);
      expect(uselessLegs).toStrictEqual([
        {
          _id: "hdGC8IiC4yXkDcIZ",
          data: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "pUfoMRe5yg648gkI",
          data: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomenInstance.data.hp.max! * 2; // 10
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockAbdomenInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Crash Test Dummy becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "unconscious",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/unconscious.svg"]);
      expect(uselessLegs).toStrictEqual([
        {
          _id: "hdGC8IiC4yXkDcIZ",
          data: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "pUfoMRe5yg648gkI",
          data: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 3*HP kills the actor", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomenInstance.data.hp.max! * 3; // 15
      const actorTotalHp = mockActorInstance.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const {
        hitLocationUpdates,
        actorUpdates,
        notification,
        addTokenEffects,
        uselessLegs,
      } = applyTestDamage(appliedDamage, true, mockAbdomenInstance, mockActorInstance);

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Crash Test Dummy dies instantly.");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            health: "dead",
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(addTokenEffects).toStrictEqual(["icons/svg/skull.svg"]);
      expect(uselessLegs).toStrictEqual([]);
    });
  });
});

export function applyTestDamage(
  damage: number,
  applyDamageToTotalHp: boolean,
  hitLocationData: HitLocationItemData,
  actorData: CharacterActorData
) {
  const damageEffects = DamageCalculations.addWound(damage, true, hitLocationData, actorData);
  mergeObject(hitLocationData, damageEffects.hitLocationUpdates);
  mergeObject(actorData, damageEffects.actorUpdates);
  actorData.data.attributes.health = DamageCalculations.getCombinedActorHealth(actorData);
  return damageEffects;
}
