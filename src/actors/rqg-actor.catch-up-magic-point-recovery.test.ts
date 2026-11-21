import { afterEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";
import { CharacterDataModel } from "../data-model/actor-data/character-data-model";
import { buildCharacterSystem } from "../data-model/actor-data/character-data-model-test-helpers";

function createCharacterActor(overrides: {
  magicPoints?: { value: number; max: number };
  pow?: number | null;
  magicPointRecoveryRateFactor?: number;
  magicPointRecoverySettledWorldTime?: number | null;
  hasPlayerOwner?: boolean;
  automaticRecoveryPaused?: boolean;
}): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.hasPlayerOwner = overrides.hasPlayerOwner ?? true;
  actor.system = {
    characteristics: { power: { value: overrides.pow === undefined ? 18 : overrides.pow } },
    attributes: {
      automaticRecoveryPaused: overrides.automaticRecoveryPaused ?? false,
      magicPoints: overrides.magicPoints ?? { value: 5, max: 18 },
      magicPointRecoveryRateFactor: overrides.magicPointRecoveryRateFactor ?? 1,
      magicPointRecoverySettledWorldTime: overrides.magicPointRecoverySettledWorldTime ?? null,
    },
  } as any;
  actor.update = vi.fn().mockResolvedValue(actor);
  return actor;
}

describe("RqgActor.catchUpMagicPointRecovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (game as any).time;
  });

  it("seeds a never-settled checkpoint to now without recovering points", async () => {
    const actor = createCharacterActor({ magicPointRecoverySettledWorldTime: null });
    (game as any).time = { worldTime: 12_345 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).toHaveBeenCalledWith({
      system: {
        attributes: {
          magicPoints: { value: 5 },
          magicPointRecoverySettledWorldTime: 12_345,
        },
      },
    });
  });

  it("does nothing when no whole point has accrued since the checkpoint", async () => {
    const actor = createCharacterActor({ magicPointRecoverySettledWorldTime: 0 });
    (game as any).time = { worldTime: 60 }; // 1 minute elapsed, needs 80 for 18 max @ rate 1

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
  });

  it("recovers whole points and advances the checkpoint, clamped to max", async () => {
    const actor = createCharacterActor({
      magicPoints: { value: 17, max: 18 },
      magicPointRecoverySettledWorldTime: 0,
    });
    // 80 minutes/point at rate 1 for an 18-max pool; give it 3 points' worth.
    (game as any).time = { worldTime: 80 * 60 * 3 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).toHaveBeenCalledWith({
      system: {
        attributes: {
          magicPoints: { value: 18 }, // clamped to max, not 20
          magicPointRecoverySettledWorldTime: 80 * 60 * 3,
        },
      },
    });
  });

  it("keeps points held above max, only advancing the checkpoint", async () => {
    const actor = createCharacterActor({
      magicPoints: { value: 21, max: 18 },
      magicPointRecoverySettledWorldTime: 0,
    });
    (game as any).time = { worldTime: 80 * 60 * 3 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).toHaveBeenCalledWith({
      system: {
        attributes: {
          magicPoints: { value: 21 },
          magicPointRecoverySettledWorldTime: 80 * 60 * 3,
        },
      },
    });
  });

  it("is a no-op for a non-character actor", async () => {
    const actor = createCharacterActor({});
    actor.type = "creature";
    (game as any).time = { worldTime: 999_999 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
  });

  it("recovers for an NPC with no player owner", async () => {
    const actor = createCharacterActor({
      magicPointRecoverySettledWorldTime: 0,
      hasPlayerOwner: false,
    });
    (game as any).time = { worldTime: 80 * 60 * 3 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).toHaveBeenCalledWith({
      system: {
        attributes: {
          magicPoints: { value: 8 },
          magicPointRecoverySettledWorldTime: 80 * 60 * 3,
        },
      },
    });
  });

  it("does not recover or advance the checkpoint while paused", async () => {
    const actor = createCharacterActor({
      automaticRecoveryPaused: true,
      hasPlayerOwner: false,
      magicPointRecoverySettledWorldTime: 0,
    });
    (game as any).time = { worldTime: 7 * 24 * 60 * 60 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
  });

  it("is a no-op when the magicPointRecoveryEnabled world setting is off (#1035)", async () => {
    const actor = createCharacterActor({ magicPointRecoverySettledWorldTime: 0 });
    (game as any).time = { worldTime: 80 * 60 * 3 };
    const originalSettings = (game as any).settings;
    (game as any).settings = { get: vi.fn().mockReturnValue(false) };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
    (game as any).settings = originalSettings;
  });
});

describe("RqgActor.catchUpMagicPointRecovery rate (Core p.54)", () => {
  afterEach(() => {
    delete (game as any).time;
  });

  it("recovers at POW per day, not at the maximum's rate", async () => {
    // POW 12 with a base max of 21: 12 points a day, so a quarter day gives 3, not 5
    const actor = createCharacterActor({
      magicPoints: { value: 5, max: 21 },
      pow: 12,
      magicPointRecoverySettledWorldTime: 0,
    });
    (game as any).time = { worldTime: 6 * 60 * 60 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update.mock.calls[0]?.[0].system.attributes.magicPoints.value).toBe(8);
  });

  it("recovers nothing without POW", async () => {
    const actor = createCharacterActor({
      magicPoints: { value: 5, max: 21 },
      pow: null,
      magicPointRecoverySettledWorldTime: 0,
    });
    (game as any).time = { worldTime: 7 * 24 * 60 * 60 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
  });
});

describe("RqgActor.gainMagicPoints", () => {
  const updatedValue = (actor: any) =>
    actor.update.mock.calls[0]?.[0].system.attributes.magicPoints.value;

  it("adds points up to max", async () => {
    const actor = createCharacterActor({ magicPoints: { value: 15, max: 18 } });
    await actor.gainMagicPoints(5);
    expect(updatedValue(actor)).toBe(18);
  });

  it("goes above max when allowed", async () => {
    const actor = createCharacterActor({ magicPoints: { value: 15, max: 18 } });
    await actor.gainMagicPoints(5, { allowAboveMax: true });
    expect(updatedValue(actor)).toBe(20);
  });

  it("caps a POW-less actor at its baseMax-derived maximum", async () => {
    const system = buildCharacterSystem();
    (system.characteristics.power as { value: number | null }).value = null;
    Object.assign(system.attributes.magicPoints, { value: 15, baseMax: 21 });
    const model = Object.assign(new CharacterDataModel({}), system);
    model.prepareDerivedData();
    const actor = createCharacterActor({});
    actor.system = model;

    await actor.gainMagicPoints(10);

    expect(updatedValue(actor)).toBe(21);
  });

  it("never lowers points already above max", async () => {
    const actor = createCharacterActor({ magicPoints: { value: 20, max: 18 } });
    await actor.gainMagicPoints(2);
    expect(actor.update).not.toHaveBeenCalled();
  });
});
