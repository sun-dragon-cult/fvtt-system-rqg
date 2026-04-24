import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { WeaponDataModel } from "@item-model/weaponDataModel.ts";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import {
  getLegacyWeaponSkillReference,
  getLegacyWeaponSkillReferenceForUsage,
  isLegacyWeaponSkillReferenceRqid,
  legacyWeaponSkillRefsFlag,
  parseLegacyWeaponSkillReference,
  preserveLegacyWeaponSkillReference,
} from "@item-model/weaponSkillLink.ts";
import { Weapon } from "./weapon";
import { migrateWeaponSkillLinks } from "../../system/migrations/migrations-item/migrateWeaponSkillLinks";

type TestItemCollection = any[] & { get: (id: string) => any };

function withItemGet(items: any[]): TestItemCollection {
  const collection = [...items] as TestItemCollection;
  collection.get = (id: string) => collection.find((item) => item.id === id || item._id === id);
  return collection;
}

function makeSkill({ id, name, rqid }: { id: string; name: string; rqid?: string }): any {
  return {
    id,
    _id: id,
    type: ItemTypeEnum.Skill,
    name,
    system: { chance: 75 },
    flags: rqid
      ? {
          rqg: {
            documentRqidFlags: {
              id: rqid,
            },
          },
        }
      : {},
  };
}

function makeWeapon({ actor, usage }: { actor?: any; usage?: Record<string, any> } = {}): any {
  const emptyUsage = {
    skillRqidLink: undefined,
    combatManeuvers: [],
    damage: "",
    minStrength: 0,
    minDexterity: 0,
    strikeRank: 0,
  };

  return {
    type: ItemTypeEnum.Weapon,
    actor,
    system: {
      usage: {
        oneHand: { ...emptyUsage },
        offHand: { ...emptyUsage },
        twoHand: { ...emptyUsage },
        missile: { ...emptyUsage },
        ...usage,
      },
    },
  };
}

describe("weapon skill link handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fromUuid).mockResolvedValue(null);
  });

  it("rejects legacy remembered payloads in the weapon rqid schema", () => {
    const schema = WeaponDataModel.defineSchema();
    const usageField: any = schema.usage;
    const oneHandField: any = usageField.schema.oneHand;
    const skillRqidLinkField: any = oneHandField.schema.skillRqidLink;
    const validate = skillRqidLinkField.schema.rqid.options.validate as (value: string) => boolean;

    expect(validate("i.skill.[Compendium.world.new-attack-type.Item.bite] / [abc123]")).toBe(false);
  });

  it("preserves legacy link data in dedicated migration fields", () => {
    const usage: Record<string, unknown> = {
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "abc123",
    };

    const preserved = preserveLegacyWeaponSkillReference(usage);

    expect(preserved).toEqual({
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "abc123",
    });
    expect(getLegacyWeaponSkillReference(usage)).toEqual({
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "abc123",
    });
  });

  it("moves previously remembered legacy rqids into flags-based preservation input", () => {
    const usage: Record<string, unknown> = {
      skillRqidLink: {
        rqid: "i.skill.[Compendium.world.new-attack-type.Item.bite] / [embedded-bite]",
        name: "NOT-FOUND",
      },
    };

    expect(isLegacyWeaponSkillReferenceRqid((usage["skillRqidLink"] as any).rqid)).toBe(true);
    expect(parseLegacyWeaponSkillReference((usage["skillRqidLink"] as any).rqid)).toEqual({
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "embedded-bite",
    });

    const preserved = preserveLegacyWeaponSkillReference(usage);

    expect(preserved).toEqual({
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "embedded-bite",
    });
    expect((usage["skillRqidLink"] as any).rqid).toBe("");
  });

  it("reads preserved legacy references from rqg flags first", () => {
    const itemData: Record<string, unknown> = {
      flags: {
        rqg: {
          [legacyWeaponSkillRefsFlag]: {
            oneHand: {
              skillOrigin: "Compendium.world.new-attack-type.Item.bite",
              skillId: "embedded-bite",
            },
          },
        },
      },
      system: {
        usage: {
          ["oneHand"]: {
            skillOrigin: "Compendium.world.new-attack-type.Item.should-not-be-used",
            skillId: "other-id",
          },
        },
      },
    };

    expect(getLegacyWeaponSkillReferenceForUsage(itemData, "oneHand")).toEqual({
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "embedded-bite",
    });
  });

  it("migration turns preserved legacy data into a valid rqid link and clears the migration fields", async () => {
    const originSkill = makeSkill({ id: "world-bite", name: "Bite", rqid: "i.skill.bite" });
    const actor = {
      name: "Actor",
      type: ActorTypeEnum.Character,
      items: withItemGet([]),
    };
    vi.mocked(fromUuid).mockResolvedValue(originSkill);
    const weapon = makeWeapon({
      actor,
      usage: {
        oneHand: {
          skillRqidLink: { rqid: "", name: "" },
        },
      },
    });
    weapon.flags = {
      rqg: {
        [legacyWeaponSkillRefsFlag]: {
          oneHand: {
            skillOrigin: "Compendium.world.new-attack-type.Item.bite",
            skillId: "embedded-bite",
          },
        },
      },
    };

    await expect(migrateWeaponSkillLinks(weapon, actor as any)).resolves.toMatchObject({
      system: {
        usage: {
          oneHand: {
            skillRqidLink: {
              rqid: "i.skill.bite",
              name: "Bite",
            },
          },
        },
      },
      flags: {
        rqg: {
          [legacyWeaponSkillRefsFlag]: {
            "-=oneHand": null,
          },
        },
      },
    });
  });

  it("resolves linked skills synchronously from valid embedded rqid links only", () => {
    const embeddedSkill = makeSkill({ id: "embedded-bite", name: "Bite", rqid: "i.skill.bite" });
    const actor = {
      items: withItemGet([embeddedSkill]),
      getBestEmbeddedDocumentByRqid: vi.fn((rqid: string | undefined) =>
        rqid === "i.skill.bite" ? embeddedSkill : undefined,
      ),
    };

    const weapon = makeWeapon({
      actor,
      usage: {
        oneHand: {
          skillRqidLink: { rqid: "i.skill.bite", name: "Bite" },
        },
      },
    });

    expect(Weapon.resolveLinkedSkill(weapon, "oneHand")).toBe(embeddedSkill);
  });
});
