import { DamageCalculations } from "./hit-location-damage-calculations";
import { mockActor as mockActorOriginal } from "../../../test/mocks/mockActor.ts";
import { applyTestDamage } from "./hit-location-test-helpers";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { localize } from "../../system/util";
import { describe, it, expect, beforeEach } from "vitest";

describe("Inflict Damage", () => {
  let mockActor: CharacterActor;
  let mockLeftLeg: HitLocationItem;
  let mockHead: HitLocationItem;
  let mockChest: HitLocationItem;
  let mockAbdomen: HitLocationItem;

  beforeEach(() => {
    mockActor = JSON.parse(JSON.stringify(mockActorOriginal));
    mockLeftLeg = mockActor.items.find((i) => i.name === "Left Leg")! as HitLocationItem;
    mockHead = mockActor.items.find((i) => i.name === "Head")! as HitLocationItem;
    mockChest = mockActor.items.find((i) => i.name === "Chest")! as HitLocationItem;
    mockAbdomen = mockActor.items.find((i) => i.name === "Abdomen")! as HitLocationItem;
    (global as any).ui = {
      notifications: {
        info(_msg: string, _other?: any) {},
        error(_msg: string, _other?: any) {},
      },
    };
  });

  describe("Limb Damage", () => {
    it("should be correct for smaller wounds", () => {
      const appliedDamage = mockLeftLeg.system.hitPoints.max! - 1;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          hitLocationHealthState: "wounded",
          actorHealthImpact: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockLeftLeg.system.hitPoints.max!;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "useless",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        localize("RQG.Item.HitLocation.Notification.LimbUseless", {
          speakerName: "Pelle Plutt",
          hitLocationName: "Left Leg",
        }),
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockLeftLeg.system.hitPoints.max! * 2;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "shock",
          hitLocationHealthState: "useless",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        localize("RQG.Item.HitLocation.Notification.LimbShock", {
          speakerName: "Pelle Plutt",
        }),
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockLeftLeg.system.hitPoints.max! * 3;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;
      const maxDamage = mockLeftLeg.system.hitPoints.max! * 2;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "shock",
          hitLocationHealthState: "severed",
          wounds: [maxDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt's Left Leg is severed or irrevocably maimed. Only a 6 point heal applied within ten minutes can restore a severed limb, assuming all parts are available. Pelle Plutt is functionally incapacitated and can no longer fight until healed and is in shock. Self healing is still possible.",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      applyTestDamage(222, true, mockLeftLeg, mockActor);
      const appliedDamage = 3;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockLeftLeg,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({});
      expect(actorUpdates).toStrictEqual({});
      expect(notification).toBe(
        localize("RQG.Item.HitLocation.Notification.SeveredCannotBeHit", {
          hitLocationName: "Left Leg",
        }),
      );
      expect(uselessLegs).toStrictEqual([]);
    });
  });

  describe("Head Damage", () => {
    it("should be correct for smaller wounds", () => {
      const appliedDamage = mockHead.system.hitPoints.max! - 1;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        system: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should knock actor unconscious", () => {
      const appliedDamage = mockHead.system.hitPoints.max!;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt is unconscious and must be healed or treated with First Aid within five minutes (one full turn) or die",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockHead.system.hitPoints.max! * 2;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockHead.system.hitPoints.max! * 3;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockHead,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "dead",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Pelle Plutt dies instantly.");
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockChest.system.hitPoints.max! - 1;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "wounded",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockChest.system.hitPoints.max!;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "shock",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        localize("RQG.Item.HitLocation.Notification.ChestShock", {
          speakerName: "Pelle Plutt",
        }),
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockChest.system.hitPoints.max! * 2;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockChest.system.hitPoints.max! * 3;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockChest,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "dead",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Pelle Plutt dies instantly.");
      expect(actorUpdates).toStrictEqual({
        system: {
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
      const appliedDamage = mockAbdomen.system.hitPoints.max! - 1;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor,
      );

      expect((hitLocationUpdates.system as any)?.wounds).toStrictEqual([appliedDamage]);
      expect((hitLocationUpdates.system as any)?.hitLocationHealthState).toBe("wounded");
      expect(notification).toBe("");
      expect(actorUpdates).toStrictEqual({
        system: {
          attributes: {
            hitPoints: {
              value: actorTotalHp - appliedDamage,
            },
          },
        },
      });
      expect(uselessLegs).toStrictEqual([]);
    });

    it(">= HP should make actor fall", () => {
      const appliedDamage = mockAbdomen.system.hitPoints.max!;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor,
      );

      expect((hitLocationUpdates.system as any)?.wounds).toStrictEqual([appliedDamage]);
      expect((hitLocationUpdates.system as any)?.hitLocationHealthState).toBe("wounded");
      expect(notification).toBe(
        "Both legs are useless and Pelle Plutt falls to the ground. Pelle Plutt may fight from the ground in subsequent melee rounds. Will bleed to death, if not healed or treated with First Aid within ten minutes.",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
          system: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "RFt7m9xXHtjpVNeY",
          system: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 2*HP should knock actor unconscious", () => {
      const appliedDamage = mockAbdomen.system.hitPoints.max! * 2;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
          system: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "RFt7m9xXHtjpVNeY",
          system: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 2*HP from 2 smaller wounds should still knock actor unconscious", () => {
      const appliedDamage = mockAbdomen.system.hitPoints.max!;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      applyTestDamage(appliedDamage, true, mockAbdomen, mockActor);
      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "unconscious",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage, appliedDamage],
        },
      });
      expect(notification).toBe(
        "Pelle Plutt becomes unconscious and begins to lose 1 hit point per melee round from bleeding unless healed or treated with First Aid.",
      );
      expect(actorUpdates).toStrictEqual({
        system: {
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
          system: {
            hitLocationHealthState: "useless",
          },
        },
        {
          _id: "RFt7m9xXHtjpVNeY",
          system: {
            hitLocationHealthState: "useless",
          },
        },
      ]);
    });

    it(">= 3*HP kills the actor", () => {
      const appliedDamage = mockAbdomen.system.hitPoints.max! * 3;
      const actorTotalHp = mockActor.system.attributes.hitPoints.value!;

      const { hitLocationUpdates, actorUpdates, notification, uselessLegs } = applyTestDamage(
        appliedDamage,
        true,
        mockAbdomen,
        mockActor,
      );

      expect(hitLocationUpdates).toStrictEqual({
        system: {
          actorHealthImpact: "dead",
          hitLocationHealthState: "wounded",
          wounds: [appliedDamage],
        },
      });
      expect(notification).toBe("Pelle Plutt dies instantly.");
      expect(actorUpdates).toStrictEqual({
        system: {
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

  describe("Combined Actor Health", () => {
    it("derives actor health from total HP and hit-location impacts", () => {
      expect(DamageCalculations.getCombinedActorHealth(mockActor as any)).toBe("healthy");
    });
  });
});
