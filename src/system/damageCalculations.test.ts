import { DamageCalculations } from "./damageCalculations";
import { mockActor as mockActorOriginal } from "../mocks/mockActor";
import { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData";

describe("Inflict Damage", () => {
  let mockActor: any;
  let mockLeftLeg: any;
  let mockHead: any;
  let mockChest: any;
  let mockAbdomen: any;

  beforeEach(() => {
    mockActor = JSON.parse(JSON.stringify(mockActorOriginal));
    mockLeftLeg = mockActor.items.find((i: any) => i.data.name === "leftLeg").data;
    mockHead = mockActor.items.find((i: any) => i.data.name === "head").data;
    mockChest = mockActor.items.find((i: any) => i.data.name === "chest").data;
    mockAbdomen = mockActor.items.find((i: any) => i.data.name === "abdomen").data;
  });

  describe("Limb Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLeg.data.hp.max! - 1;
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          hitLocationHealthState: "wounded",
          actorHealthImpact: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should make limb useless", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLeg.data.hp.max!; // 5
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "useless",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt's leftLeg is useless and cannot hold anything / support standing. Pelle Plutt can still fight with whatever limbs are still functional."
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it("should be maxed out to 2*Limb HP", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLeg.data.hp.max! * 2; // 10
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "shock",
          hitLocationHealthState: "useless",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt is functionally incapacitated, can no longer fight until healed and is in shock. Self healing may be attempted."
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 3 * HP should severe the limb", () => {
      // --- Arrange ---
      const appliedDamage = mockLeftLeg.data.hp.max! * 3; // 15
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15
      const maxDamage = mockLeftLeg.data.hp.max! * 2; // Limbs can't take more damage

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "shock",
          hitLocationHealthState: "severed",
          wounds: [maxDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt's leftLeg is severed or irrevocably maimed. Only a 6 point heal applied within ten minutes can restore a severed limb, assuming all parts are available. Pelle Plutt is functionally incapacitated and can no longer fight until healed and is in shock. Self healing is still possible."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - maxDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });

    it("should not be affected by more damage if previously severed", () => {
      // --- Arrange --- (Sever arm)
      applyTestDamage(222, true, mockLeftLeg, mockActor);
      const appliedDamage = 3;

      // --- Act --- (Try to hit the same arm again)
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({});
      expect(actorUpdates).toStrictEqual({});
      expect(notification).toBe(
        "leftLeg is gone and cannot be hit anymore, reroll to get a new hit location!"
      );
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Head Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = mockHead.data.hp.max! - 1;
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "wounded",
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockHead.data.hp.max!; // 2
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die"
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockHead.data.hp.max! * 2; // 10
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 3*HP kills the actor", () => {
      // --- Arrange ---
      const appliedDamage = mockHead.data.hp.max! * 3; // 15
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "dead",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Pelle Plutt dies instantly.");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Chest Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = mockChest.data.hp.max! - 1;
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should put actor in shock", () => {
      // --- Arrange ---
      const appliedDamage = mockChest.data.hp.max!; // 6
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "shock",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt falls and is too busy coughing blood to do anything. Will bleed to death in ten minutes unless the bleeding is stopped by First Aid, and cannot take any action, including healing."
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockChest.data.hp.max! * 2; // 12
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= 3*HP kills the actor", () => {
      // --- Arrange ---
      const appliedDamage = mockChest.data.hp.max! * 3; // 18
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "dead",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Pelle Plutt dies instantly.");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Abdomen Damage", () => {
    it("should be correct for smaller wounds", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomen.data.hp.max! - 1;
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates.data?.wounds).toStrictEqual([appliedDamage]);
      expect(hitLocationUpdates.data?.hitLocationHealthState).toBe("wounded");
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
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should make actor fall", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomen.data.hp.max!;
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates.data?.wounds).toStrictEqual([appliedDamage]);
      expect(hitLocationUpdates.data?.hitLocationHealthState).toBe("wounded");
      expect(notification).toBe(
        "Both legs are useless and Pelle Plutt falls to the ground. Pelle Plutt may fight from the ground in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes."
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
      expect(uselessLegs).toStrictEqual([
        {
          _id: "Dhm40qEh3Idp5HSE",
          data: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "RFt7m9xXHtjpVNeY",
          data: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomen.data.hp.max! * 2; // 10
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
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
      expect(uselessLegs).toStrictEqual([
        {
          _id: "Dhm40qEh3Idp5HSE",
          data: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "RFt7m9xXHtjpVNeY",
          data: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 2*HP from 2 smaller wounds should still knock actor unconscious", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomen.data.hp.max!; // 10
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      applyTestDamage(appliedDamage, true, mockAbdomen, mockActor);
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage, appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid."
      );
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage * 2,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([
        {
          _id: "Dhm40qEh3Idp5HSE",
          data: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "RFt7m9xXHtjpVNeY",
          data: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 3*HP kills the actor", () => {
      // --- Arrange ---
      const appliedDamage = mockAbdomen.data.hp.max! * 3; // 15
      const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

      // --- Act ---
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor
      );

      // --- Assert ---
      expect(hitLocationUpdates).toStrictEqual({
        data: {
          actorHealthImpact: "dead",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Pelle Plutt dies instantly.");
      expect(actorUpdates).toStrictEqual({
        data: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });
  });
});

export function applyTestDamage(
  damage: number,
  applyDamageToTotalHp: boolean,
  hitLocationData: any,
  actorData: ActorData
) {
  const damageEffects = DamageCalculations.addWound(
    damage,
    true,
    hitLocationData,
    actorData,
    "Pelle Plutt"
  );
  mergeObject(hitLocationData, damageEffects.hitLocationUpdates);
  mergeObject(actorData, damageEffects.actorUpdates);
  actorData.data.attributes.health = DamageCalculations.getCombinedActorHealth(actorData);
  hitLocationData.data.hp.value =
    hitLocationData.data.hp.max! -
    hitLocationData.data.wounds.reduce((acc: number, val: number) => acc + val, 0);
  return damageEffects;
}
