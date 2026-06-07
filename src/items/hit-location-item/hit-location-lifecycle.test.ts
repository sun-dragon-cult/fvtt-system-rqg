import { describe, expect, it } from "vitest";
import { hitLocationLifecycle } from "./hit-location-lifecycle";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { ActorTypeEnum } from "../../data-model/actor-data/rqg-actor-data.ts";

describe("hitLocationLifecycle.handleActorPrepareDerivedData", () => {
  it("recalculates hit location HP from the actor's derived total HP", () => {
    const actor = {
      type: ActorTypeEnum.Character,
      system: {
        attributes: {
          hitPoints: {
            max: 17,
          },
        },
      },
    } as any;

    const chest = {
      type: ItemTypeEnum.HitLocation,
      actor,
      system: {
        baseHpDelta: 1,
        wounds: [],
        hitPoints: {
          value: 0,
          max: 0,
        },
      },
    } as any;

    const arm = {
      type: ItemTypeEnum.HitLocation,
      actor,
      system: {
        baseHpDelta: -1,
        wounds: [2],
        hitPoints: {
          value: 0,
          max: 0,
        },
      },
    } as any;

    hitLocationLifecycle.handleActorPrepareDerivedData(chest);
    hitLocationLifecycle.handleActorPrepareDerivedData(arm);

    expect(chest.system.hitPoints.max).toBe(7);
    expect(chest.system.hitPoints.value).toBe(7);
    expect(arm.system.hitPoints.max).toBe(5);
    expect(arm.system.hitPoints.value).toBe(3);
  });
});
