import { beforeEach, describe, expect, it } from "vitest";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { ActorTypeEnum } from "../../data-model/actor-data/rqg-actor-data.ts";
import { RQG_CONFIG } from "../../system/config";
import { systemId } from "../../system/config";
import { skillLifecycle } from "./skill-lifecycle";

function makeActor({
  encumbrance = { equipped: 0, max: 0 },
  skillCategoryModifiers = {},
  items = [] as any[],
}: {
  encumbrance?: { equipped: number; max: number };
  skillCategoryModifiers?: Record<string, number>;
  items?: any[];
} = {}): any {
  return {
    type: ActorTypeEnum.Character,
    system: {
      attributes: { encumbrance },
      skillCategoryModifiers,
    },
    items,
  };
}

function makeSkillItem({
  category = "agility",
  baseChance = 0,
  gainedChance = 0,
  rqid,
}: {
  category?: string;
  baseChance?: number;
  gainedChance?: number;
  rqid?: string;
} = {}): any {
  return {
    type: ItemTypeEnum.Skill,
    system: { category, baseChance, gainedChance },
    getFlag: (scope: string, key: string) =>
      scope === systemId && key === "documentRqidFlags" && rqid ? { id: rqid } : undefined,
  };
}

describe("skillLifecycle.handleActorPrepareDerivedData", () => {
  beforeEach(() => {
    CONFIG.RQG.skillRqid = RQG_CONFIG.skillRqid;
  });

  it("derives chance from baseChance + gainedChance + categoryMod", () => {
    const actor = makeActor({ skillCategoryModifiers: { agility: 5 } });
    const skillItem = makeSkillItem({ baseChance: 30, gainedChance: 10 });
    skillItem.actor = actor;

    skillLifecycle.handleActorPrepareDerivedData(skillItem);

    expect(skillItem.system.categoryMod).toBe(5);
    expect(skillItem.system.chance).toBe(45); // 30 + 10 + 5
  });

  it("keeps chance at 0 when baseChance is 0 and gainedChance doesn't push it positive", () => {
    const actor = makeActor({ skillCategoryModifiers: { agility: 20 } });
    const skillItem = makeSkillItem({ baseChance: 0, gainedChance: 0 });
    skillItem.actor = actor;

    skillLifecycle.handleActorPrepareDerivedData(skillItem);

    expect(skillItem.system.chance).toBe(0);
  });

  it("derives an effective chance once gainedChance pushes baseChance 0 above 0", () => {
    const actor = makeActor({ skillCategoryModifiers: { agility: 5 } });
    const skillItem = makeSkillItem({ baseChance: 0, gainedChance: 10 });
    skillItem.actor = actor;

    skillLifecycle.handleActorPrepareDerivedData(skillItem);

    expect(skillItem.system.chance).toBe(15); // 0 + 10 + 5
  });

  it("clamps the effective chance at a minimum of 0", () => {
    const actor = makeActor({ skillCategoryModifiers: { agility: -50 } });
    const skillItem = makeSkillItem({ baseChance: 10, gainedChance: 0 });
    skillItem.actor = actor;

    skillLifecycle.handleActorPrepareDerivedData(skillItem);

    expect(skillItem.system.chance).toBe(0);
  });

  it("subtracts the equipped ENC modifier from Dodge", () => {
    const actor = makeActor({ encumbrance: { equipped: 3, max: 10 } });
    const skillItem = makeSkillItem({
      category: "agility",
      baseChance: 50,
      rqid: RQG_CONFIG.skillRqid.dodge,
    });
    skillItem.actor = actor;

    skillLifecycle.handleActorPrepareDerivedData(skillItem);

    expect(skillItem.system.chance).toBe(47); // 50 - min(3, 10)
  });

  it("subtracts the largest equipped armor Move Quietly penalty", () => {
    const actor = makeActor({
      items: [
        {
          type: ItemTypeEnum.Armor,
          system: { equippedStatus: "equipped", moveQuietlyPenalty: -5 },
        },
        {
          type: ItemTypeEnum.Armor,
          system: { equippedStatus: "equipped", moveQuietlyPenalty: -15 },
        },
        {
          type: ItemTypeEnum.Armor,
          system: { equippedStatus: "carried", moveQuietlyPenalty: -99 },
        },
      ],
    });
    const skillItem = makeSkillItem({
      category: "stealth",
      baseChance: 40,
      rqid: RQG_CONFIG.skillRqid.moveQuietly,
    });
    skillItem.actor = actor;

    skillLifecycle.handleActorPrepareDerivedData(skillItem);

    expect(skillItem.system.chance).toBe(25); // 40 - 15 (largest equipped penalty)
  });
});
