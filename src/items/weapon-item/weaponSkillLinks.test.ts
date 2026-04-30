import { beforeEach, describe, expect, it, vi } from "vitest";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { WeaponDataModel } from "@item-model/weaponDataModel.ts";
import { ActorTypeEnum } from "../../data-model/actor-data/rqgActorData";
import {
  encodeLegacyWeaponSkillReferenceInRqid,
  getLegacyWeaponSkillReferenceForUsage,
  isLegacyWeaponSkillReferenceRqid,
  parseLegacyWeaponSkillReference,
} from "@item-model/weaponSkillLink.ts";
import { hasLinkedSkillReference, resolveLinkedSkill } from "./weaponSkillLinks";
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

  it("accepts legacy-encoded rqid payloads in the weapon rqid schema", () => {
    const schema = WeaponDataModel.defineSchema();
    const usageField: any = schema.usage;
    const oneHandField: any = usageField.schema.oneHand;
    const skillRqidLinkField: any = oneHandField.schema.skillRqidLink;
    const validate = skillRqidLinkField.schema.rqid.options.validate as (value: string) => boolean;

    expect(validate("i.skill.[Compendium.world.new-attack-type.Item.bite] / [abc123]")).toBe(true);
  });

  it("encodes legacy link data into the rqid field", () => {
    const usage: Record<string, unknown> = {
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "abc123",
      skillRqidLink: { rqid: "", name: "" },
    };

    const result = encodeLegacyWeaponSkillReferenceInRqid(usage);

    expect(result).toEqual({
      rqid: "i.skill.[Compendium.world.new-attack-type.Item.bite] / [abc123]",
      name: "",
    });
  });

  it("creates skillRqidLink when missing and encodes legacy data", () => {
    const usage: Record<string, unknown> = {
      skillOrigin: "Compendium.world.old-weapon.Item.sword",
      skillId: "oldId",
    };

    const result = encodeLegacyWeaponSkillReferenceInRqid(usage);

    expect(result).toEqual({
      rqid: "i.skill.[Compendium.world.old-weapon.Item.sword] / [oldId]",
      name: "",
    });
  });

  it("preserves existing legacy-encoded rqid in rqid field", () => {
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

    // Encoding again should return the same legacy-encoded rqid
    const result = encodeLegacyWeaponSkillReferenceInRqid(usage);

    expect(result).toEqual({
      rqid: "i.skill.[Compendium.world.new-attack-type.Item.bite] / [embedded-bite]",
      name: "NOT-FOUND",
    });
  });

  it("reads legacy references from system.usage fields", () => {
    const itemData: Record<string, unknown> = {
      system: {
        usage: {
          ["oneHand"]: {
            skillOrigin: "Compendium.world.new-attack-type.Item.bite",
            skillId: "other-id",
          },
        },
      },
    };

    expect(getLegacyWeaponSkillReferenceForUsage(itemData, "oneHand")).toEqual({
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "other-id",
    });
  });

  it("migration turns legacy-encoded rqid into a valid rqid link", async () => {
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
          skillRqidLink: {
            rqid: "i.skill.[Compendium.world.new-attack-type.Item.bite] / [embedded-bite]",
            name: "",
          },
        },
      },
    });

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

    expect(resolveLinkedSkill(weapon, "oneHand")).toBe(embeddedSkill);
  });

  it("hasLinkedSkillReference returns false for legacy-encoded rqid", () => {
    const weapon = makeWeapon({
      usage: {
        oneHand: {
          skillRqidLink: {
            rqid: "i.skill.[Compendium.world.attack.Item.bite] / [abc]",
            name: "",
          },
        },
      },
    });

    expect(hasLinkedSkillReference(weapon, "oneHand")).toBe(false);
  });

  it("resolveLinkedSkill returns undefined for legacy-encoded rqid", () => {
    const actor = {
      items: withItemGet([]),
      getBestEmbeddedDocumentByRqid: vi.fn(() => undefined),
    };

    const weapon = makeWeapon({
      actor,
      usage: {
        oneHand: {
          skillRqidLink: {
            rqid: "i.skill.[Compendium.world.attack.Item.bite] / [abc]",
            name: "",
          },
        },
      },
    });

    expect(resolveLinkedSkill(weapon, "oneHand")).toBeUndefined();
    expect(actor.getBestEmbeddedDocumentByRqid).not.toHaveBeenCalled();
  });

  it("does not overwrite a valid rqid with a legacy-encoded rqid", () => {
    const usage: Record<string, unknown> = {
      skillOrigin: "Compendium.world.new-attack-type.Item.bite",
      skillId: "abc123",
      skillRqidLink: { rqid: "i.skill.bite", name: "Bite" },
    };

    expect(encodeLegacyWeaponSkillReferenceInRqid(usage)).toBeUndefined();
  });
});
