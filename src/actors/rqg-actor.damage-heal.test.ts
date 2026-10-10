import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RqgActor } from "./rqg-actor";
import { ActorTypeEnum } from "../data-model/actor-data/rqg-actor-data";
import { DamageCalculations } from "../items/hit-location-item/hit-location-damage-calculations";
import { HealingCalculations } from "../items/hit-location-item/hit-location-healing-calculations";

vi.mock("../system/fvtt-type-compat", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSpeakerCompat: () => ({ alias: "Test Actor" }),
}));

function createHitLocationItem(
  id: string,
  overrides: { wounds?: number[]; armorPoints?: number; dieFrom?: number; dieTo?: number } = {},
): any {
  return {
    id,
    name: id,
    type: "hitLocation",
    system: {
      wounds: overrides.wounds ?? [],
      armorPoints: overrides.armorPoints ?? 0,
      dieFrom: overrides.dieFrom ?? 1,
      dieTo: overrides.dieTo ?? 20,
      hitPoints: { value: 5, max: 5 },
    },
    update: vi.fn().mockResolvedValue(undefined),
  };
}

function createCharacterActor(items: any[]): any {
  const actor = new RqgActor({ name: "Test Actor", type: ActorTypeEnum.Character }) as any;
  actor.type = ActorTypeEnum.Character;
  actor.system = { attributes: { hitPoints: { value: 15, max: 15 } } };
  const itemCollection: any = [...items];
  itemCollection.get = (id: string) => itemCollection.find((i: any) => i.id === id);
  actor.items = itemCollection;
  items.forEach((i) => (i.parent = actor));
  actor.update = vi.fn().mockResolvedValue(actor);
  return actor;
}

const noDamageEffects = {
  hitLocationUpdates: { system: { wounds: [3] } },
  actorUpdates: { system: { attributes: { hitPoints: { value: 12 } } } },
  notification: "",
  uselessLegs: [],
};

describe("RqgActor damage, heal and rollHitLocation (#1171)", () => {
  beforeEach(() => {
    vi.stubGlobal("ChatMessage", { create: vi.fn().mockResolvedValue(undefined) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("damage", () => {
    it("subtracts armor and applies the rest as a wound", async () => {
      const chest = createHitLocationItem("chest", { armorPoints: 2 });
      const actor = createCharacterActor([chest]);
      const addWound = vi.spyOn(DamageCalculations, "addWound").mockReturnValue(noDamageEffects);

      const result = await actor.damage({ amount: 5, location: chest });

      expect(result).toEqual({ location: chest, damage: 3, absorbed: 2 });
      expect(addWound).toHaveBeenCalledWith(3, true, chest, actor, expect.anything());
      expect(chest.update).toHaveBeenCalledWith(noDamageEffects.hitLocationUpdates);
      expect(actor.update).toHaveBeenCalledWith(noDamageEffects.actorUpdates);
      expect(ChatMessage.create).toHaveBeenCalledOnce();
    });

    it("ignores armor with ignoreArmor", async () => {
      const chest = createHitLocationItem("chest", { armorPoints: 4 });
      const actor = createCharacterActor([chest]);
      const addWound = vi.spyOn(DamageCalculations, "addWound").mockReturnValue(noDamageEffects);

      const result = await actor.damage({ amount: 3, location: chest, ignoreArmor: true });

      expect(result.damage).toBe(3);
      expect(addWound).toHaveBeenCalledWith(3, true, chest, actor, expect.anything());
    });

    it("writes nothing when the armor stops all damage", async () => {
      const chest = createHitLocationItem("chest", { armorPoints: 6 });
      const actor = createCharacterActor([chest]);
      const addWound = vi.spyOn(DamageCalculations, "addWound");

      const result = await actor.damage({ amount: 5, location: chest });

      expect(result).toEqual({ location: chest, damage: 0, absorbed: 5 });
      expect(addWound).not.toHaveBeenCalled();
      expect(actor.update).not.toHaveBeenCalled();
      expect(ChatMessage.create).not.toHaveBeenCalled();
    });

    it("rolls the location on the actor's own table for 'random'", async () => {
      const leg = createHitLocationItem("leg", { dieFrom: 1, dieTo: 4 });
      const head = createHitLocationItem("head", { dieFrom: 19, dieTo: 20 });
      const actor = createCharacterActor([leg, head]);
      vi.stubGlobal(
        "Roll",
        class {
          async evaluate() {
            return { total: 19 };
          }
        },
      );
      vi.spyOn(DamageCalculations, "addWound").mockReturnValue(noDamageEffects);

      const result = await actor.damage({ amount: 2, location: "random" });

      expect(result.location).toBe(head);
    });

    it("refuses a hit location of another actor", async () => {
      const otherChest = createHitLocationItem("chest");
      createCharacterActor([otherChest]);
      const actor = createCharacterActor([]);

      await expect(actor.damage({ amount: 2, location: otherChest })).rejects.toThrow();
    });

    it("waits for a pending hit point write before reading the actor", async () => {
      const chest = createHitLocationItem("chest");
      const actor = createCharacterActor([chest]);
      const order: string[] = [];
      let release!: () => void;
      const pending = actor.serializeHitPointsWrite(
        () =>
          new Promise<void>((resolve) => {
            release = () => {
              order.push("catch-up");
              resolve();
            };
          }),
      );
      vi.spyOn(DamageCalculations, "addWound").mockImplementation(() => {
        order.push("damage");
        return noDamageEffects;
      });

      const damage = actor.damage({ amount: 2, location: chest });
      await Promise.resolve();
      release();
      await Promise.all([pending, damage]);

      expect(order).toEqual(["catch-up", "damage"]);
    });
  });

  describe("heal", () => {
    it("heals the chosen wound and reports what was healed", async () => {
      const chest = createHitLocationItem("chest", { wounds: [3, 2] });
      const actor = createCharacterActor([chest]);
      chest.update.mockImplementation(async (data: any) => {
        chest.system.wounds = data.system.wounds;
      });
      const healWound = vi.spyOn(HealingCalculations, "healWound");

      const result = await actor.heal({ location: chest, points: 2, wound: 1 });

      expect(healWound).toHaveBeenCalledWith(2, 1, chest, actor, false);
      expect(result).toEqual({ location: chest, healed: 2, remainingWounds: [3] });
      expect(actor.update).toHaveBeenCalledWith(
        expect.objectContaining({ system: { attributes: { hitPoints: { value: 15 } } } }),
      );
    });

    it("heals all damage without restoring a severed limb", async () => {
      const leg = createHitLocationItem("leg", { wounds: [4, 4] });
      const actor = createCharacterActor([leg]);
      const healWound = vi.spyOn(HealingCalculations, "healWound");

      await actor.heal({ location: leg, points: "all" });

      expect(healWound).toHaveBeenCalledWith(8, undefined, leg, actor, false);
    });

    it("restores a severed limb on 6+ points unless told otherwise", async () => {
      const leg = createHitLocationItem("leg", { wounds: [10] });
      const actor = createCharacterActor([leg]);
      const healWound = vi.spyOn(HealingCalculations, "healWound");

      await actor.heal({ location: leg, points: 6 });
      await actor.heal({ location: leg, points: 6, restoreSevered: false });

      expect(healWound).toHaveBeenNthCalledWith(1, 6, undefined, leg, actor, true);
      expect(healWound).toHaveBeenNthCalledWith(2, 6, undefined, leg, actor, false);
    });
  });

  describe("getHitLocationByRoll", () => {
    it("throws when no hit location covers the roll", () => {
      const actor = createCharacterActor([createHitLocationItem("leg", { dieFrom: 1, dieTo: 4 })]);

      expect(() => actor.getHitLocationByRoll(12)).toThrow();
    });
  });
});
