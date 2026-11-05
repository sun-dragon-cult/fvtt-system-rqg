import { describe, expect, it } from "vitest";
import { ActorTypeEnum } from "../actor-data/rqg-actor-data";
import { WeaponDataModel } from "./weapon-data-model";

function usage(overrides: Record<string, unknown> = {}) {
  return {
    skillRqidLink: undefined,
    combatManeuvers: [],
    damage: "",
    minStrength: 0,
    minDexterity: 0,
    strikeRank: 0,
    ...overrides,
  };
}

function weaponSystem(actor: any, oneHand: Record<string, unknown>, meleeAttack = 0): any {
  const weapon: any = {
    name: "Spear",
    actor,
    parent: actor,
    system: {
      effect: {
        add: { melee: { attack: meleeAttack, parry: 0 }, missile: { attack: 0, parry: 0 } },
      },
      usage: { oneHand: usage(oneHand), offHand: usage(), twoHand: usage(), missile: usage() },
    },
  };
  weapon.system.parent = weapon;
  return weapon.system;
}

function characterActor(strength: number, dexterity: number): any {
  const skill = { id: "s1", name: "Spear", system: { chance: 75 } };
  return {
    type: ActorTypeEnum.Character,
    system: { characteristics: { strength: { value: strength }, dexterity: { value: dexterity } } },
    getBestEmbeddedDocumentByRqid: (rqid: string) => (rqid === "i.skill.spear" ? skill : undefined),
  };
}

const getUsageInfo = (system: any, usageType: "oneHand") =>
  WeaponDataModel.prototype.getUsageInfo.call(system, usageType);

describe("WeaponDataModel#getUsageInfo", () => {
  it("adds the weapon's effect modifier to the linked skill's chance", () => {
    const system = weaponSystem(
      characterActor(13, 12),
      { skillRqidLink: { rqid: "i.skill.spear" } },
      5,
    );

    const info = getUsageInfo(system, "oneHand");

    expect(info).toMatchObject({
      skillChance: 75,
      weaponEffectModifier: 5,
      totalChance: 80,
      unusable: false,
    });
    expect(info.skillItem?.name).toBe("Spear");
  });

  it("marks the usage unusable when STR is below the requirement", () => {
    const system = weaponSystem(characterActor(9, 12), {
      skillRqidLink: { rqid: "i.skill.spear" },
      minStrength: 12,
    });

    expect(getUsageInfo(system, "oneHand")).toMatchObject({ underMinSTR: true, unusable: true });
  });

  it("throws for a weapon that is not owned by a character", () => {
    const system = weaponSystem(undefined, {});

    expect(() => getUsageInfo(system, "oneHand")).toThrow();
  });
});
