import { afterEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

function createCharacterActor(overrides: {
  magicPoints?: { value: number; max: number };
  magicPointRecoveryRateFactor?: number;
  magicPointRecoverySettledWorldTime?: number | null;
  hasPlayerOwner?: boolean;
}): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.hasPlayerOwner = overrides.hasPlayerOwner ?? true;
  actor.system = {
    attributes: {
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

  it("is a no-op for a non-character actor", async () => {
    const actor = createCharacterActor({});
    actor.type = "creature";
    (game as any).time = { worldTime: 999_999 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
  });

  it("is a no-op for an actor with no player owner", async () => {
    const actor = createCharacterActor({
      magicPointRecoverySettledWorldTime: 0,
      hasPlayerOwner: false,
    });
    (game as any).time = { worldTime: 80 * 60 * 3 };

    await actor.catchUpMagicPointRecovery();

    expect(actor.update).not.toHaveBeenCalled();
  });
});
