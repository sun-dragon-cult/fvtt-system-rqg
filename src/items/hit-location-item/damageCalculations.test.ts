import { mockLeftLeg, mockHead, mockChest, mockAbdomen } from "../../mocks/mockHitLocation";
import { DamageCalculations } from "./damageCalculations";
import { mockActor } from "../../mocks/mockActor";

describe("Limb Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 2;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockLeftLeg,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });

  it("should be maxed out to 2*Limb HP", () => {
    const appliedDamage = mockLeftLeg.data.hp.max! * 2; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockLeftLeg,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "useless",
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
  });

  it(">= 3 * HP should severe the limb", () => {
    const appliedDamage = mockLeftLeg.data.hp.max! * 3; // 15
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15
    const maxDamage = mockLeftLeg.data.hp.max! * 2; // Limbs can't take more damage

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockLeftLeg,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "severed",
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
  });

  it("should not be affected by more damage if previously severed", () => {
    // Sever arm
    const {
      hitLocationUpdates: preHit,
      actorUpdates: preActor,
      notification: preNot,
    } = DamageCalculations.addWound(222, true, mockLeftLeg, mockActor as any);
    mergeObject(mockLeftLeg, preHit);

    const appliedDamage = 3;

    // Try to hit the same arm again
    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockLeftLeg,
      mockActor as any
    );

    expect(hitLocationUpdates).toStrictEqual({});
    expect(actorUpdates).toStrictEqual({});
    expect(notification).toBe(
      "leftLeg is gone and cannot be hit anymore, reroll to get a new hit location!"
    );
  });
});

describe("Head Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 2;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockHead,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });

  it(">= 2*HP should knock actor unconscious", () => {
    const appliedDamage = mockHead.data.hp.max! * 2; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockHead,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });

  it(">= 3*HP kills the actor", () => {
    const appliedDamage = mockHead.data.hp.max! * 3; // 15
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockHead,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });
});

describe("Chest Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 5;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockChest,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });

  it(">= 2*HP should knock actor unconscious", () => {
    const appliedDamage = mockChest.data.hp.max! * 2; // 12
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockChest,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });

  it(">= 3*HP kills the actor", () => {
    const appliedDamage = mockChest.data.hp.max! * 3; // 18
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockChest,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });
});

describe("Abdomen Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 3;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockAbdomen,
      mockActor as any
    );
    expect(hitLocationUpdates.data.wounds).toStrictEqual([appliedDamage]);
    expect(hitLocationUpdates.data.limbHealthState).toBe("wounded");
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
  });

  it(">= 2*HP should knock actor unconscious", () => {
    const appliedDamage = mockAbdomen.data.hp.max! * 2; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockAbdomen,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });

  it(">= 3*HP kills the actor", () => {
    const appliedDamage = mockAbdomen.data.hp.max! * 3; // 15
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const { hitLocationUpdates, actorUpdates, notification } = DamageCalculations.addWound(
      appliedDamage,
      true,
      mockAbdomen,
      mockActor as any
    );
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
  });
});
