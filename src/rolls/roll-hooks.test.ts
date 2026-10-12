import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "../actors/rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";
import { AbilityDataModel } from "../data-model/item-data/ability-data-model";
import { AbilityRoll } from "./ability-roll/ability-roll";
import { AbilitySuccessLevelEnum } from "./ability-roll/ability-roll.defs";
import { CharacteristicRoll } from "./characteristic-roll/characteristic-roll";

const listeners = new Map<string, ((...args: any[]) => unknown)[]>();

function on(hook: string, fn: (...args: any[]) => unknown): void {
  listeners.set(hook, [...(listeners.get(hook) ?? []), fn]);
}

function createCharacterActor(): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.checkExperience = vi.fn().mockResolvedValue(undefined);
  return actor;
}

describe("roll hooks (#1132)", () => {
  beforeEach(() => {
    listeners.clear();
    vi.stubGlobal("Hooks", {
      call: (hook: string, ...args: unknown[]) =>
        (listeners.get(hook) ?? []).every((fn) => fn(...args) !== false),
      callAll: (hook: string, ...args: unknown[]) => {
        (listeners.get(hook) ?? []).forEach((fn) => fn(...args));
        return true;
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("ability rolls", () => {
    const success = { successLevel: AbilitySuccessLevelEnum.Success } as AbilityRoll;

    function abilityModel(): any {
      return {
        parent: { name: "Climb" },
        checkExperience: vi.fn().mockResolvedValue(undefined),
      };
    }

    it("lets a pre hook add modifiers, then reports the roll and checks experience", async () => {
      const rollAndShow = vi.spyOn(AbilityRoll, "rollAndShow").mockResolvedValue(success);
      const after = vi.fn();
      on("rqg.preAbilityRoll", (_item, options) => {
        options.modifiers.push({ description: "Demoralized", value: -20 });
      });
      on("rqg.abilityRoll", after);
      const model = abilityModel();

      const roll = await AbilityDataModel.prototype.rollWithOptions.call(model, {
        naturalSkill: 50,
      });

      expect(rollAndShow).toHaveBeenCalledWith(
        expect.objectContaining({ modifiers: [{ description: "Demoralized", value: -20 }] }),
      );
      expect(after).toHaveBeenCalledWith(model.parent, success, expect.anything());
      expect(model.checkExperience).toHaveBeenCalledWith(AbilitySuccessLevelEnum.Success);
      expect(roll).toBe(success);
    });

    it("rolls nothing when a pre hook returns false", async () => {
      const rollAndShow = vi.spyOn(AbilityRoll, "rollAndShow");
      const after = vi.fn();
      on("rqg.preAbilityRoll", () => false);
      on("rqg.abilityRoll", after);
      const model = abilityModel();

      const roll = await AbilityDataModel.prototype.rollWithOptions.call(model, {
        naturalSkill: 50,
      });

      expect(roll).toBeUndefined();
      expect(rollAndShow).not.toHaveBeenCalled();
      expect(after).not.toHaveBeenCalled();
      expect(model.checkExperience).not.toHaveBeenCalled();
    });
  });

  describe("characteristic rolls", () => {
    it("runs both hooks around the roll and checks experience", async () => {
      const roll = { successLevel: AbilitySuccessLevelEnum.Special } as CharacteristicRoll;
      vi.spyOn(CharacteristicRoll, "rollAndShow").mockResolvedValue(roll);
      const before = vi.fn();
      const after = vi.fn();
      on("rqg.preCharacteristicRoll", before);
      on("rqg.characteristicRoll", after);
      const actor = createCharacterActor();
      const options = { characteristicName: "power", characteristicValue: 12 };

      await actor.rollCharacteristicWithOptions(options);

      expect(before).toHaveBeenCalledWith(actor, expect.objectContaining({ modifiers: [] }));
      expect(after).toHaveBeenCalledWith(actor, roll, options);
      expect(actor.checkExperience).toHaveBeenCalledWith("power", AbilitySuccessLevelEnum.Special);
    });

    it("rolls nothing when a pre hook returns false", async () => {
      const rollAndShow = vi.spyOn(CharacteristicRoll, "rollAndShow");
      on("rqg.preCharacteristicRoll", () => false);
      const actor = createCharacterActor();

      const roll = await actor.rollCharacteristicWithOptions({
        characteristicName: "power",
        characteristicValue: 12,
      });

      expect(roll).toBeUndefined();
      expect(rollAndShow).not.toHaveBeenCalled();
      expect(actor.checkExperience).not.toHaveBeenCalled();
    });
  });

  describe("reputation rolls", () => {
    it("runs both hooks around the roll", async () => {
      const roll = { successLevel: AbilitySuccessLevelEnum.Failure } as AbilityRoll;
      vi.spyOn(AbilityRoll, "rollAndShow").mockResolvedValue(roll);
      const after = vi.fn();
      on("rqg.preReputationRoll", (_actor, options) => {
        options.modifiers.push({ description: "Famous here", value: 10 });
      });
      on("rqg.reputationRoll", after);
      const actor = createCharacterActor();

      const result = await actor.rollReputationWithOptions({ naturalSkill: 15 });

      expect(result).toBe(roll);
      expect(after).toHaveBeenCalledWith(
        actor,
        roll,
        expect.objectContaining({ modifiers: [{ description: "Famous here", value: 10 }] }),
      );
    });

    it("rolls nothing when a pre hook returns false", async () => {
      const rollAndShow = vi.spyOn(AbilityRoll, "rollAndShow");
      on("rqg.preReputationRoll", () => false);
      const actor = createCharacterActor();

      expect(await actor.rollReputationWithOptions({ naturalSkill: 15 })).toBeUndefined();
      expect(rollAndShow).not.toHaveBeenCalled();
    });
  });
});
