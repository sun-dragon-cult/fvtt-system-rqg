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

  function actorWith(
    magicPoints: { value: number; max: number; baseMax: number | null },
    pow: number | null = 12,
    fromEffects = 0,
  ): any {
    const actor = createCharacterActor();
    actor.system = {
      characteristics: { dexterity: { value: null }, power: { value: pow } },
      effect: { add: { magicPoints: { max: fromEffects } } },
      attributes: {
        hitPoints: { value: 10 },
        magicPoints,
        magicPointRecoveryRateFactor: 1,
        magicPointRecoverySettledWorldTime: 0,
      },
    };
    return actor;
  }

  const baseMaxChange = (baseMax: number | null): any => ({
    system: { attributes: { magicPoints: { baseMax } } },
  });
  const settledAfter = async (actor: any, changes: any) => {
    await actor._preUpdate(changes, {}, {});
    return changes.system.attributes.magicPointRecoverySettledWorldTime;
  };

  const foundryActor = Object.getPrototypeOf(RqgActor.prototype);
  beforeEach(() => {
    foundryActor._preUpdate = vi.fn();
    (game as any).time = { worldTime: day };
  });
  afterEach(() => {
    delete foundryActor._preUpdate;
    delete (game as any).time;
  });

  it("keeps a day accrued at max 12 worth 12 points at max 24, without writing the value", async () => {
    const changes = baseMaxChange(24);

    // Half a day at 24 points a day is the 12 points a day at 12 gave
    expect(await settledAfter(actorWith({ value: 5, max: 12, baseMax: null }), changes)).toBe(
      day / 2,
    );
    expect(changes.system.attributes.magicPoints.value).toBeUndefined();
  });

  it("keeps the accrued points when the base maximum is lowered, so recovery caps at the new one", async () => {
    // 6 hours at 24 a day: 6 points, which take 12 hours at 12 a day
    (game as any).time = { worldTime: day / 4 };
    const changes = baseMaxChange(12);

    expect(await settledAfter(actorWith({ value: 5, max: 24, baseMax: 24 }), changes)).toBe(
      day / 4 - day / 2,
    );
    expect(changes.system.attributes.magicPoints.value).toBeUndefined();
  });

  it("counts effects on the maximum, and follows POW again when cleared", async () => {
    // Base 20 + 4 from effects = 24; cleared, POW 12 + 4 = 16
    expect(
      await settledAfter(actorWith({ value: 5, max: 24, baseMax: 20 }, 12, 4), baseMaxChange(null)),
    ).toBe(day - (day * 24) / 16);
  });

  it("starts from now when there was no recovery before or will be none after", async () => {
    expect(
      await settledAfter(actorWith({ value: 0, max: 0, baseMax: null }, null), baseMaxChange(21)),
    ).toBe(day);
    expect(
      await settledAfter(actorWith({ value: 5, max: 12, baseMax: null }), baseMaxChange(0)),
    ).toBe(day);
  });

  it("settles to now when the update also sets the value", async () => {
    const changes: any = { system: { attributes: { magicPoints: { baseMax: 21, value: 2 } } } };

    expect(await settledAfter(actorWith({ value: 5, max: 12, baseMax: null }), changes)).toBe(day);
    expect(changes.system.attributes.magicPoints.value).toBe(2);
  });

  it("rescales when the sheet submits the value unchanged", async () => {
    const changes: any = { system: { attributes: { magicPoints: { baseMax: 24, value: 5 } } } };

    expect(await settledAfter(actorWith({ value: 5, max: 12, baseMax: null }), changes)).toBe(
      day / 2,
    );
  });

  it("keeps a checkpoint the update already specifies", async () => {
    const changes: any = {
      system: {
        attributes: { magicPoints: { baseMax: 21 }, magicPointRecoverySettledWorldTime: 100 },
      },
    };

    expect(await settledAfter(actorWith({ value: 5, max: 12, baseMax: null }), changes)).toBe(100);
  });
});
