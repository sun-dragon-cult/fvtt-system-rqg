import { mockLeftLeg, mockHead, mockChest, mockAbdomen } from "../../mocks/mockHitLocation";
import { DamageCalculations } from "./damageCalculations";
import { mockActor } from "../../mocks/mockActor";

describe("Limb Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 2;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockLeftLeg, mockActor as any);
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
    expect(effects).toStrictEqual([]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= HP should make limb useless", () => {
    const appliedDamage = mockLeftLeg.data.hp.max!; // 5
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockLeftLeg, mockActor as any);
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "useless",
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
    expect(effects).toStrictEqual([]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it("should be maxed out to 2*Limb HP", () => {
    const appliedDamage = mockLeftLeg.data.hp.max! * 2; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockLeftLeg, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/lightning.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= 3 * HP should severe the limb", () => {
    const appliedDamage = mockLeftLeg.data.hp.max! * 3; // 15
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15
    const maxDamage = mockLeftLeg.data.hp.max! * 2; // Limbs can't take more damage

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockLeftLeg, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/lightning.svg"]);
    expect(uselessLegs).toStrictEqual([]);
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
    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockLeftLeg, mockActor as any);

    expect(hitLocationUpdates).toStrictEqual({});
    expect(actorUpdates).toStrictEqual({});
    expect(notification).toBe(
      "leftLeg is gone and cannot be hit anymore, reroll to get a new hit location!"
    );
    expect(effects).toStrictEqual([]);
    expect(uselessLegs).toStrictEqual([]);
  });
});

describe("Head Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 2;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockHead, mockActor as any);
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
    expect(effects).toStrictEqual([]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= HP should knock actor unconscious", () => {
    const appliedDamage = mockHead.data.hp.max!; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockHead, mockActor as any);
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
    expect(effects).toStrictEqual(["icons/svg/unconscious.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= 2*HP should knock actor unconscious", () => {
    const appliedDamage = mockHead.data.hp.max! * 2; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockHead, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/unconscious.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= 3*HP kills the actor", () => {
    const appliedDamage = mockHead.data.hp.max! * 3; // 15
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockHead, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/skull.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });
});

describe("Chest Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 5;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockChest, mockActor as any);
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
    expect(effects).toStrictEqual([]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= HP should put actor in shock", () => {
    const appliedDamage = mockChest.data.hp.max!; // 6
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockChest, mockActor as any);
    expect(hitLocationUpdates).toStrictEqual({
      data: {
        limbHealthState: "wounded",
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
    expect(effects).toStrictEqual(["icons/svg/lightning.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= 2*HP should knock actor unconscious", () => {
    const appliedDamage = mockChest.data.hp.max! * 2; // 12
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockChest, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/unconscious.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= 3*HP kills the actor", () => {
    const appliedDamage = mockChest.data.hp.max! * 3; // 18
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockChest, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/skull.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });
});

describe("Abdomen Damage", () => {
  it("should be correct for smaller wounds", () => {
    const appliedDamage = 3;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockAbdomen, mockActor as any);
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
    expect(effects).toStrictEqual([]);
    expect(uselessLegs).toStrictEqual([]);
  });

  it(">= HP should make actor fall", () => {
    const appliedDamage = mockAbdomen.data.hp.max!;
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockAbdomen, mockActor as any);
    expect(hitLocationUpdates.data.wounds).toStrictEqual([appliedDamage]);
    expect(hitLocationUpdates.data.limbHealthState).toBe("wounded");
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
    expect(effects).toStrictEqual(["icons/svg/falling.svg"]);
    expect(uselessLegs).toStrictEqual([
      {
        _id: "hdGC8IiC4yXkDcIZ",
        data: {
          limbHealthState: "useless",
        },
      },
      {
        _id: "pUfoMRe5yg648gkI",
        data: {
          limbHealthState: "useless",
        },
      },
    ]);
  });

  it(">= 2*HP should knock actor unconscious", () => {
    const appliedDamage = mockAbdomen.data.hp.max! * 2; // 10
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockAbdomen, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/unconscious.svg"]);
    expect(uselessLegs).toStrictEqual([
      {
        _id: "hdGC8IiC4yXkDcIZ",
        data: {
          limbHealthState: "useless",
        },
      },
      {
        _id: "pUfoMRe5yg648gkI",
        data: {
          limbHealthState: "useless",
        },
      },
    ]);
  });

  it(">= 3*HP kills the actor", () => {
    const appliedDamage = mockAbdomen.data.hp.max! * 3; // 15
    const actorTotalHp = mockActor.data.attributes.hitPoints.value; // 15

    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      effects,
      uselessLegs,
    } = DamageCalculations.addWound(appliedDamage, true, mockAbdomen, mockActor as any);
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
    expect(effects).toStrictEqual(["icons/svg/skull.svg"]);
    expect(uselessLegs).toStrictEqual([]);
  });
});
