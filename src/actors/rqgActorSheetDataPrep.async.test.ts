import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEquippedProjectileOptions,
  getIncorrectRunesText,
  getUnspecifiedSkillText,
  organizeEmbeddedItems,
} from "./rqgActorSheetDataPrep";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RuneTypeEnum } from "@item-model/runeData.ts";
import { SkillCategoryEnum } from "@item-model/skillData.ts";

type ItemCollection = any[] & { get: (id: string) => any };

function withItemGet(items: any[]): any {
  const collection = [...items] as ItemCollection;
  collection.get = (id: string) => collection.find((item) => item.id === id);
  return collection;
}

function actorWithItems(items: any[]): any {
  return {
    items: withItemGet(items),
    system: {
      characteristics: {
        strength: { value: 12 },
        dexterity: { value: 11 },
      },
    },
    getBestEmbeddedDocumentByRqid: vi.fn(() => undefined),
    getEmbeddedCollection: vi.fn(() => withItemGet(items)),
  };
}

describe("organizeEmbeddedItems", () => {
  beforeEach(() => {
    Object.defineProperty(game, "system", {
      configurable: true,
      writable: true,
      value: {
        documentTypes: {
          Item: {
            [ItemTypeEnum.Cult]: [],
            [ItemTypeEnum.Gear]: [],
            [ItemTypeEnum.HitLocation]: [],
            [ItemTypeEnum.Passion]: [],
            [ItemTypeEnum.Rune]: [],
            [ItemTypeEnum.RuneMagic]: [],
            [ItemTypeEnum.Skill]: [],
            [ItemTypeEnum.SpiritMagic]: [],
            [ItemTypeEnum.Weapon]: [],
            [ItemTypeEnum.Armor]: [],
          },
        },
      },
    });

    Object.defineProperty(game, "settings", {
      configurable: true,
      writable: true,
      value: {
        get: vi.fn((_systemId: string, key: string) => {
          if (key === "sortHitLocationsLowToHigh") {
            return false;
          }
          return undefined;
        }),
      },
    });

    if (!foundry.utils.isEmpty) {
      foundry.utils.isEmpty = (value: unknown) => {
        if (value == null) {
          return true;
        }
        if (typeof value === "string") {
          return value.length === 0;
        }
        if (Array.isArray(value)) {
          return value.length === 0;
        }
        if (typeof value === "object") {
          return Object.keys(value as Record<string, unknown>).length === 0;
        }
        return false;
      };
    }
  });

  it("groups/sorts embedded data and enriches cult/passion fields", async () => {
    const cult = {
      id: "cult-main",
      type: ItemTypeEnum.Cult,
      system: {
        runePoints: { max: 3 },
        holyDays: "Holy days",
        gifts: "Gifts",
        geases: "Geases",
        joinedCults: [{ rank: "initiate" }],
        commonRuneMagicRqidLinks: [{ rqid: "i.rune-magic.bladesharp" }],
      },
    };

    const actor = actorWithItems([
      cult,
      {
        id: "skill-b",
        type: ItemTypeEnum.Skill,
        name: "Brawl",
        system: { category: SkillCategoryEnum.Agility },
      },
      {
        id: "skill-a",
        type: ItemTypeEnum.Skill,
        name: "Athletics",
        system: { category: SkillCategoryEnum.Agility },
      },
      {
        id: "rune-valid",
        type: ItemTypeEnum.Rune,
        flags: { rqg: { documentRqidFlags: { id: "i.rune.fire-element" } } },
        system: { runeType: { type: RuneTypeEnum.Element } },
      },
      {
        id: "rune-invalid",
        type: ItemTypeEnum.Rune,
        link: "@UUID[i.rune.invalid]",
        flags: { rqg: { documentRqidFlags: { id: "i.rune.invalid" } } },
        system: { runeType: { type: "unknown" } },
      },
      {
        id: "hl-high",
        type: ItemTypeEnum.HitLocation,
        flags: { rqg: { documentRqidFlags: { id: "i.hit-location.chest" } } },
        system: { dieFrom: 11, dieTo: 20, wounds: [1, 3] },
      },
      {
        id: "hl-low",
        type: ItemTypeEnum.HitLocation,
        flags: { rqg: { documentRqidFlags: { id: "i.hit-location.head" } } },
        system: { dieFrom: 1, dieTo: 10, wounds: [2] },
      },
      {
        id: "passion-fear",
        type: ItemTypeEnum.Passion,
        sort: 2,
        system: { description: "Fear (Chaos)" },
      },
      {
        id: "rune-magic-common",
        type: ItemTypeEnum.RuneMagic,
        sort: 1,
        flags: { rqg: { documentRqidFlags: { id: "i.rune-magic.bladesharp" } } },
        system: { cultId: "cult-main" },
      },
    ]);

    const incorrectRunes: any[] = [];
    const result = await organizeEmbeddedItems(actor, incorrectRunes);

    expect(result[ItemTypeEnum.Skill][SkillCategoryEnum.Agility].map((s: any) => s.name)).toEqual([
      "Athletics",
      "Brawl",
    ]);

    expect(result[ItemTypeEnum.Rune][RuneTypeEnum.Element].fire.id).toBe("rune-valid");
    expect(incorrectRunes.map((r) => r.id)).toEqual(["rune-invalid"]);

    expect(result[ItemTypeEnum.HitLocation].map((h: any) => h.id)).toEqual(["hl-high", "hl-low"]);
    expect(result[ItemTypeEnum.HitLocation][0].system.woundsString).toBe("1+3");

    expect(result[ItemTypeEnum.Cult][0].system.enrichedHolyDays).toBe("Holy days");
    expect(result[ItemTypeEnum.Cult][0].system.enrichedGifts).toBe("Gifts");
    expect(result[ItemTypeEnum.Cult][0].system.enrichedGeases).toBe("Geases");
    expect(result[ItemTypeEnum.Cult][0].hasAccessToRuneMagic).toBe(true);

    expect(result[ItemTypeEnum.Passion][0].system.enrichedDescription).toBe("Fear (Chaos)");
    expect(result[ItemTypeEnum.RuneMagic][0].system.isCommon).toBe(true);
  });
});

describe("warning text helpers", () => {
  it("returns enriched text for unspecified skills", async () => {
    const actor = actorWithItems([
      {
        id: "skill-1",
        type: ItemTypeEnum.Skill,
        name: "Craft",
        link: "@UUID[i.skill.craft]",
        system: { specialization: "..." },
      },
    ]);

    const text = await getUnspecifiedSkillText(actor);

    expect(text).toContain("RQG.Actor.Skill.UnspecifiedSkillWarning");
    expect(text).toContain("@UUID[i.skill.craft]");
  });

  it("returns undefined when no unspecified skills exist", async () => {
    const actor = actorWithItems([
      {
        id: "skill-1",
        type: ItemTypeEnum.Skill,
        name: "Craft (Wood)",
        link: "@UUID[i.skill.craft-wood]",
        system: { specialization: "Wood" },
      },
    ]);

    const text = await getUnspecifiedSkillText(actor);

    expect(text).toBeUndefined();
  });

  it("returns incorrect-rune warning and populates invalid rune list", async () => {
    const validPowerTruthRune = {
      id: "rune-truth",
      flags: { rqg: { documentRqidFlags: { id: "i.rune.truth-power" } } },
    };

    const actor = actorWithItems([
      {
        id: "rune-truth",
        type: ItemTypeEnum.Rune,
        flags: { rqg: { documentRqidFlags: { id: "i.rune.truth-power" } } },
      },
      {
        id: "rune-extra",
        type: ItemTypeEnum.Rune,
        flags: { rqg: { documentRqidFlags: { id: "i.rune.extra-power" } } },
      },
    ]);

    const embeddedRunes: any = {
      element: {},
      form: {},
      condition: {},
      technique: {},
      power: { truth: validPowerTruthRune },
    };

    const incorrectRunes = [{ link: "@UUID[i.rune.invalid]" }] as any;

    const text = await getIncorrectRunesText(actor, embeddedRunes, incorrectRunes);

    expect(text).toContain("RQG.Actor.Rune.IncorrectRuneWarning");
    expect(text).toContain("@UUID[i.rune.invalid]");
    expect((embeddedRunes as any).invalid.map((r: any) => r.id)).toEqual(["rune-extra"]);
  });
});

describe("getEquippedProjectileOptions", () => {
  it("returns default option + equipped projectile weapons", () => {
    const actor = actorWithItems([
      {
        id: "proj-equipped",
        name: "Arrow",
        type: ItemTypeEnum.Weapon,
        system: { isProjectile: true, equippedStatus: "equipped", quantity: 12 },
      },
      {
        id: "proj-carried",
        name: "Javelin",
        type: ItemTypeEnum.Weapon,
        system: { isProjectile: true, equippedStatus: "carried", quantity: 3 },
      },
      {
        id: "not-projectile",
        name: "Longsword",
        type: ItemTypeEnum.Weapon,
        system: { isProjectile: false, equippedStatus: "equipped", quantity: 1 },
      },
    ]);

    const result = getEquippedProjectileOptions(actor);

    expect(result).toEqual([
      {
        value: "",
        label: expect.stringContaining("RQG.Actor.Combat.ProjectileWeaponAmmoNotSelectedAlert"),
      },
      {
        value: "proj-equipped",
        label: "Arrow (12)",
      },
    ]);
  });
});
