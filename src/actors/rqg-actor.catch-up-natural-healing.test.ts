import { afterEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";
import { HealingCalculations } from "../items/hit-location-item/hit-location-healing-calculations";

function createHitLocationItem(id: string, wounds: number[]): any {
  return {
    id,
    type: "hitLocation",
    system: { wounds },
    update: vi.fn().mockResolvedValue(undefined),
  };
}

function createCharacterActor(overrides: {
  hitPoints?: { value: number; max: number };
  healingRate?: number;
  healingSettledWorldTime?: number | null;
  items?: any[];
}): any {
  const items: any = overrides.items ?? [];
  items.get = (id: string) => items.find((i: any) => i.id === id);
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.system = {
    attributes: {
      hitPoints: overrides.hitPoints ?? { value: 5, max: 18 },
      healingRate: overrides.healingRate ?? 2,
      healingSettledWorldTime: overrides.healingSettledWorldTime ?? null,
    },
  } as any;
  actor.items = items;
  actor.update = vi.fn().mockResolvedValue(actor);
  return actor;
}

describe("RqgActor.catchUpNaturalHealing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (game as any).time;
  });

  it("seeds a never-settled checkpoint to now without healing", async () => {
    const actor = createCharacterActor({ healingSettledWorldTime: null });
    (game as any).time = { worldTime: 12_345 };

    await actor.catchUpNaturalHealing();

    expect(actor.update).toHaveBeenCalledWith({
      system: { attributes: { healingSettledWorldTime: 12_345 } },
    });
  });

  it("does nothing when no whole week has accrued since the checkpoint", async () => {
    const actor = createCharacterActor({ healingSettledWorldTime: 0 });
    (game as any).time = { worldTime: 60 * 60 }; // 1 hour, needs a full week

    await actor.catchUpNaturalHealing();

    expect(actor.update).not.toHaveBeenCalled();
  });

  it("advances the checkpoint even with no wounded locations", async () => {
    const secondsPerWeek = 7 * 24 * 60 * 60;
    const actor = createCharacterActor({ healingSettledWorldTime: 0 });
    (game as any).time = { worldTime: secondsPerWeek };

    await actor.catchUpNaturalHealing();

    expect(actor.update).toHaveBeenCalledWith({
      system: { attributes: { healingSettledWorldTime: secondsPerWeek } },
    });
  });

  it("heals every wounded hit location by healingRate per elapsed week and advances the checkpoint", async () => {
    const secondsPerWeek = 7 * 24 * 60 * 60;
    const leftLeg = createHitLocationItem("leg1", [4]);
    const actor = createCharacterActor({
      hitPoints: { value: 10, max: 18 },
      healingRate: 2,
      healingSettledWorldTime: 0,
      items: [leftLeg],
    });
    (game as any).time = { worldTime: secondsPerWeek };

    const healSpy = vi.spyOn(HealingCalculations, "healLocationNaturally").mockReturnValue({
      hitLocationUpdates: { system: { wounds: [2] } },
      actorUpdates: { system: { attributes: { hitPoints: { value: 12 } } } },
      usefulLegs: [],
    });

    await actor.catchUpNaturalHealing();

    expect(healSpy).toHaveBeenCalledWith(2, leftLeg, actor); // 1 week elapsed * healingRate 2
    expect(leftLeg.update).toHaveBeenCalledWith({ system: { wounds: [2] } });
    expect(actor.update).toHaveBeenCalledWith({
      system: { attributes: { hitPoints: { value: 12 } } },
    });
    expect(actor.update).toHaveBeenCalledWith({
      system: { attributes: { healingSettledWorldTime: secondsPerWeek } },
    });
  });

  it("skips hit locations with no wounds", async () => {
    const secondsPerWeek = 7 * 24 * 60 * 60;
    const healthyLeg = createHitLocationItem("leg1", []);
    const actor = createCharacterActor({
      healingSettledWorldTime: 0,
      items: [healthyLeg],
    });
    (game as any).time = { worldTime: secondsPerWeek };
    const healSpy = vi.spyOn(HealingCalculations, "healLocationNaturally");

    await actor.catchUpNaturalHealing();

    expect(healSpy).not.toHaveBeenCalled();
  });

  it("is a no-op for a non-character actor", async () => {
    const actor = createCharacterActor({});
    actor.type = "creature";
    (game as any).time = { worldTime: 999_999 };

    await actor.catchUpNaturalHealing();

    expect(actor.update).not.toHaveBeenCalled();
  });
});
