import { afterEach, describe, expect, it } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";

function createCharacterActor(): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  return actor;
}

describe("RqgActor.settleHealingCheckpoint", () => {
  afterEach(() => {
    delete (game as any).time;
  });

  it("stamps the checkpoint to now when hitPoints.value changes without one", () => {
    const actor = createCharacterActor();
    (game as any).time = { worldTime: 12_345 };
    const changes: any = { system: { attributes: { hitPoints: { value: 3 } } } };

    actor.settleHealingCheckpoint(changes, true);

    expect(changes.system.attributes.healingSettledWorldTime).toBe(12_345);
  });

  it("leaves an update alone when it doesn't touch hitPoints.value", () => {
    const actor = createCharacterActor();
    (game as any).time = { worldTime: 12_345 };
    const changes: any = { system: { attributes: { magicPoints: { value: 3 } } } };

    actor.settleHealingCheckpoint(changes, false);

    expect(changes.system.attributes.healingSettledWorldTime).toBeUndefined();
  });

  it("doesn't overwrite a checkpoint the update already specifies (catch-up's own write)", () => {
    const actor = createCharacterActor();
    (game as any).time = { worldTime: 999_999 };
    const changes: any = {
      system: {
        attributes: {
          hitPoints: { value: 8 },
          healingSettledWorldTime: 4_800,
        },
      },
    };

    actor.settleHealingCheckpoint(changes, true);

    expect(changes.system.attributes.healingSettledWorldTime).toBe(4_800);
  });

  it("does nothing when worldTime isn't available yet", () => {
    const actor = createCharacterActor();
    const changes: any = { system: { attributes: { hitPoints: { value: 3 } } } };

    actor.settleHealingCheckpoint(changes, true);

    expect(changes.system.attributes.healingSettledWorldTime).toBeUndefined();
  });
});
