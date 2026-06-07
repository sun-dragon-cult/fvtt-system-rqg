import { afterEach, describe, expect, it, vi } from "vitest";
import { AbilitySuccessLevelEnum } from "../rolls/ability-roll/ability-roll.defs";
import { damageType } from "@item-model/weapon-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { HealingCalculations } from "./hit-location-item/hit-location-healing-calculations";
import { RqgItem } from "./rqg-item";
import type { DeepPartial } from "fvtt-types/utils";

type MockHitLocationItem = Pick<RqgItem, "type" | "name" | "system" | "parent" | "update">;

function createHitLocationItem(): MockHitLocationItem {
  return {
    type: ItemTypeEnum.HitLocation,
    name: "Left Leg",
    system: {
      dieFrom: 5,
      hitPoints: { value: 5, max: 5 },
      wounds: [3],
      hitLocationHealthState: "wounded",
      actorHealthImpact: "wounded",
    },
    parent: undefined,
    update: vi.fn().mockResolvedValue(undefined),
  } as unknown as MockHitLocationItem;
}

function createCharacterActor() {
  const usefulLeg = {
    update: vi.fn().mockResolvedValue(undefined),
  };

  return {
    type: ActorTypeEnum.Character,
    system: {
      attributes: {
        hitPoints: {
          value: 14,
          max: 15,
        },
      },
    },
    applyDamage: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    items: {
      get: vi.fn().mockReturnValue(usefulLeg),
    },
    usefulLeg,
  } as unknown as CharacterActor & {
    applyDamage: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    items: { get: ReturnType<typeof vi.fn> };
    usefulLeg: { update: ReturnType<typeof vi.fn> };
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RqgItem wound methods", () => {
  it("applies wounds through the parent actor with the default wound options", async () => {
    const hitLocation = createHitLocationItem();
    const actor = createCharacterActor();
    hitLocation.parent = actor;

    await RqgItem.prototype.applyWound.call(hitLocation, 7);

    expect(actor.applyDamage).toHaveBeenCalledWith(
      7,
      5,
      false,
      true,
      damageType.Impale,
      false,
      undefined,
    );
  });

  it("passes wound options through to the parent actor", async () => {
    const hitLocation = createHitLocationItem();
    const actor = createCharacterActor();
    hitLocation.parent = actor;

    await RqgItem.prototype.applyWound.call(hitLocation, 9, {
      subtractArmorPoints: false,
      applyDamageToTotalHp: false,
      damageType: damageType.Slash,
      wasDamagedReducedByParry: true,
      attackSuccessLevel: AbilitySuccessLevelEnum.Special,
    });

    expect(actor.applyDamage).toHaveBeenCalledWith(
      9,
      5,
      true,
      false,
      damageType.Slash,
      true,
      AbilitySuccessLevelEnum.Special,
    );
  });

  it("updates the hit location, actor, and useful legs while wounds remain", async () => {
    const hitLocation = createHitLocationItem();
    const actor = createCharacterActor();
    hitLocation.parent = actor;

    const usefulLegUpdate = {
      _id: "leg-1",
      system: { hitLocationHealthState: "healthy" as const },
    } as DeepPartial<Item.Source>;
    vi.spyOn(HealingCalculations, "healWound").mockReturnValue({
      hitLocationUpdates: {
        system: {
          wounds: [1],
          actorHealthImpact: "wounded",
          hitLocationHealthState: "wounded",
        },
      },
      actorUpdates: {
        system: {
          attributes: {
            hitPoints: {
              value: 15,
            },
          },
        },
      },
      usefulLegs: [usefulLegUpdate],
    });

    const hasRemainingWounds = await RqgItem.prototype.healWound.call(hitLocation, 0, 4);

    expect(hasRemainingWounds).toBe(true);
    expect(HealingCalculations.healWound).toHaveBeenCalledWith(4, 0, hitLocation, actor);
    expect(hitLocation.update).toHaveBeenCalledWith({
      system: {
        wounds: [1],
        actorHealthImpact: "wounded",
        hitLocationHealthState: "wounded",
      },
    });
    expect(actor.update).toHaveBeenCalledWith({
      system: {
        attributes: {
          hitPoints: {
            value: 15,
          },
        },
      },
    });
    expect(actor.items.get).toHaveBeenCalledWith("leg-1");
    expect(actor.usefulLeg.update).toHaveBeenCalledWith(usefulLegUpdate);
  });

  it("returns false when the wound is fully healed", async () => {
    const hitLocation = createHitLocationItem();
    const actor = createCharacterActor();
    hitLocation.parent = actor;

    vi.spyOn(HealingCalculations, "healWound").mockReturnValue({
      hitLocationUpdates: {
        system: {
          wounds: [],
          actorHealthImpact: "healthy",
          hitLocationHealthState: "healthy",
        },
      },
      actorUpdates: {
        system: {
          attributes: {
            hitPoints: {
              value: 15,
            },
          },
        },
      },
      usefulLegs: [],
    });

    const hasRemainingWounds = await RqgItem.prototype.healWound.call(hitLocation, 0, 6);

    expect(hasRemainingWounds).toBe(false);
  });

  it("falls back to current item wounds when heal updates omit wound data", async () => {
    const hitLocation = createHitLocationItem();
    const actor = createCharacterActor();
    hitLocation.parent = actor;

    vi.spyOn(HealingCalculations, "healWound").mockReturnValue({
      hitLocationUpdates: {},
      actorUpdates: {},
      usefulLegs: [],
    });

    const hasRemainingWounds = await RqgItem.prototype.healWound.call(hitLocation, 0, 1);

    expect(hasRemainingWounds).toBe(true);
  });
});
