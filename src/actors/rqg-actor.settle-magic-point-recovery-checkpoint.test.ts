import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

function createCharacterActor(): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  return actor;
}

describe("RqgActor.settleMagicPointRecoveryCheckpoint", () => {
  afterEach(() => {
    delete (game as any).time;
  });

  it("stamps the checkpoint to now when magicPoints.value changes without one", () => {
    const actor = createCharacterActor();
    (game as any).time = { worldTime: 12_345 };
    const changes: any = { system: { attributes: { magicPoints: { value: 3 } } } };

    actor.settleMagicPointRecoveryCheckpoint(changes, true);

    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBe(12_345);
  });

  it("leaves an update alone when it doesn't touch magicPoints.value", () => {
    const actor = createCharacterActor();
    (game as any).time = { worldTime: 12_345 };
    const changes: any = { system: { attributes: { hitPoints: { value: 3 } } } };

    actor.settleMagicPointRecoveryCheckpoint(changes, false);

    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBeUndefined();
  });

  it("doesn't overwrite a checkpoint the update already specifies (catch-up's own write)", () => {
    const actor = createCharacterActor();
    (game as any).time = { worldTime: 999_999 };
    const changes: any = {
      system: {
        attributes: {
          magicPoints: { value: 8 },
          magicPointRecoverySettledWorldTime: 4_800,
        },
      },
    };

    actor.settleMagicPointRecoveryCheckpoint(changes, true);

    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBe(4_800);
  });

  it("does nothing when worldTime isn't available yet", () => {
    const actor = createCharacterActor();
    const changes: any = { system: { attributes: { magicPoints: { value: 3 } } } };

    actor.settleMagicPointRecoveryCheckpoint(changes, true);

    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBeUndefined();
  });
});

describe("RqgActor._preUpdate on a base maximum change", () => {
  const day = 24 * 60 * 60;

  function actorWith(magicPoints: { value: number; max: number }, hasPlayerOwner = true): any {
    const actor = createCharacterActor();
    actor.hasPlayerOwner = hasPlayerOwner;
    actor.system = {
      characteristics: { dexterity: { value: null } },
      attributes: {
        hitPoints: { value: 10 },
        magicPoints,
        magicPointRecoveryRateFactor: 1,
        magicPointRecoverySettledWorldTime: 0,
      },
    };
    return actor;
  }

  const foundryActor = Object.getPrototypeOf(RqgActor.prototype);
  beforeEach(() => {
    foundryActor._preUpdate = vi.fn();
  });
  afterEach(() => {
    delete foundryActor._preUpdate;
    delete (game as any).time;
  });

  it("credits recovery accrued at the old rate, then settles the checkpoint", async () => {
    // Max 12: 12 points a day, so 1 day recovers up to the maximum from 5
    const actor = actorWith({ value: 5, max: 12 });
    (game as any).time = { worldTime: day / 4 };
    const changes: any = { system: { attributes: { magicPoints: { baseMax: 21 } } } };

    await actor._preUpdate(changes, {}, {});

    expect(changes.system.attributes.magicPoints.value).toBe(8);
    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBe(day / 4);
  });

  it("only settles for an actor passive recovery skips", async () => {
    const actor = actorWith({ value: 5, max: 12 }, false);
    (game as any).time = { worldTime: day };
    const changes: any = { system: { attributes: { magicPoints: { baseMax: 21 } } } };

    await actor._preUpdate(changes, {}, {});

    expect(changes.system.attributes.magicPoints.value).toBeUndefined();
    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBe(day);
  });

  it("leaves an update that sets the value itself alone", async () => {
    const actor = actorWith({ value: 5, max: 12 });
    (game as any).time = { worldTime: day };
    const changes: any = { system: { attributes: { magicPoints: { baseMax: 21, value: 2 } } } };

    await actor._preUpdate(changes, {}, {});

    expect(changes.system.attributes.magicPoints.value).toBe(2);
    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBe(day);
  });

  it("keeps a checkpoint the update already specifies", async () => {
    const actor = actorWith({ value: 5, max: 12 });
    (game as any).time = { worldTime: day };
    const changes: any = {
      system: {
        attributes: { magicPoints: { baseMax: 21 }, magicPointRecoverySettledWorldTime: 100 },
      },
    };

    await actor._preUpdate(changes, {}, {});

    expect(changes.system.attributes.magicPoints.value).toBeUndefined();
    expect(changes.system.attributes.magicPointRecoverySettledWorldTime).toBe(100);
  });
});
