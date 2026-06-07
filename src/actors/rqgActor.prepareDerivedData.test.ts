import { afterEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqgActor";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import * as itemLifecycleStrategy from "../items/itemLifecycleStrategy";
import { DamageCalculations } from "../items/hit-location-item/hit-location-damage-calculations";

function createCharacterActor(): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.items = [] as any;
  actor.system = {
    characteristics: {
      strength: { value: 20 },
      constitution: { value: 12 },
      size: { value: 13 },
      dexterity: { value: 15 },
      intelligence: { value: 12 },
      power: { value: 15 },
      charisma: { value: 11 },
    },
    attributes: {
      move: {
        currentLocomotion: "walk",
        walk: { value: 8, carryingFactor: 1 },
        value: 0,
        equipped: 0,
        travel: 0,
      },
      encumbrance: { max: 0, equipped: 0, travel: 0 },
      health: "healthy",
      hitPoints: { value: 10, max: 10 },
      magicPoints: { value: 5, max: 5 },
    },
    skillCategoryModifiers: {
      agility: 5,
      communication: 1,
      knowledge: 2,
      magic: 3,
      manipulation: 5,
      perception: 4,
      stealth: 5,
      meleeWeapons: 6,
      missileWeapons: 7,
      shields: 8,
      naturalWeapons: 9,
      otherSkills: 10,
    },
  } as any;
  return actor;
}

describe("RqgActor.prepareDerivedData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies encumbrance penalty after composed skill modifiers and updates derived fields", () => {
    const actor = createCharacterActor();
    const item = { type: "skill" } as any;
    actor.items = [item] as any;
    actor.actorCharacteristics = vi.fn().mockReturnValue({ str: 20, con: 12 });
    actor.calcMaxEncumbrance = vi.fn().mockReturnValue(3);
    actor.calcTravelEncumbrance = vi.fn().mockReturnValue(4);
    actor.calcEquippedEncumbrance = vi.fn().mockReturnValue(5);

    const itemPrepareSpy = vi
      .spyOn(itemLifecycleStrategy, "handleActorPrepareDerivedData")
      .mockImplementation(() => undefined);
    const healthSpy = vi
      .spyOn(DamageCalculations, "getCombinedActorHealth")
      .mockReturnValue("shock" as any);

    actor.prepareDerivedData();

    expect(actor.system.attributes.encumbrance).toStrictEqual({
      max: 3,
      travel: 4,
      equipped: 5,
    });
    expect(actor.system.skillCategoryModifiers).toStrictEqual({
      agility: -5,
      communication: 1,
      knowledge: 2,
      magic: 3,
      manipulation: -5,
      perception: 4,
      stealth: -5,
      meleeWeapons: -4,
      missileWeapons: -3,
      shields: -2,
      naturalWeapons: -1,
      otherSkills: 10,
    });
    expect(actor.system.attributes.move.value).toBe(8);
    expect(actor.system.attributes.move.equipped).toBe(6);
    expect(actor.system.attributes.move.travel).toBe(7);
    expect(itemPrepareSpy).toHaveBeenCalledWith(item);
    expect(healthSpy).toHaveBeenCalledWith(actor);
    expect(actor.system.attributes.health).toBe("shock");
  });

  it("uses current characteristic values when computing encumbrance max", () => {
    const actor = createCharacterActor();
    const healthSpy = vi
      .spyOn(DamageCalculations, "getCombinedActorHealth")
      .mockReturnValue("healthy" as any);

    actor.prepareDerivedData();

    expect(actor.system.attributes.encumbrance.max).toBe(16);
    expect(actor.system.attributes.encumbrance.equipped).toBe(0);
    expect(actor.system.attributes.encumbrance.travel).toBe(0);
    expect(actor.system.attributes.move.equipped).toBe(8);
    expect(actor.system.attributes.move.travel).toBe(8);
    expect(healthSpy).toHaveBeenCalledWith(actor);
  });
});
