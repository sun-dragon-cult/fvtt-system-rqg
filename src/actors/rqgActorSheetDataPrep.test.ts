import { beforeEach, describe, expect, it } from "vitest";
import {
  calcCurrencyTotals,
  getBaseStrikeRank,
  getCharacterElementRuneImgs,
  getCharacterFormRuneImgs,
  getCharacterPowerRuneImgs,
  getFreeInt,
  getHitLocationDiceRangeError,
  getLoadedMissileSr,
  getLoadedMissileSrDisplay,
  getMainCultInfo,
  getPowCrystals,
  getSpiritMagicPointSum,
  getUnloadedMissileSr,
  getUnloadedMissileSrDisplay,
} from "./rqgActorSheetDataPrep";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { RuneTypeEnum } from "@item-model/runeData.ts";
import { SkillCategoryEnum } from "@item-model/skillData.ts";

function actorWithItems(items: any[]): any {
  return {
    items,
    system: {
      characteristics: {
        intelligence: { value: 13 },
      },
    },
  };
}

describe("missile SR helpers", () => {
  beforeEach(() => {
    CONFIG.RQG.missileWeaponReloadIcon = "RELOAD";
  });

  it("returns loaded missile display values for a valid DEX SR", () => {
    expect(getLoadedMissileSrDisplay(0)).toEqual(["1", "RELOAD", "6", "RELOAD", "11"]);
    expect(getLoadedMissileSr(0)).toBe("1,6,11");
  });

  it("returns unloaded missile display values for a valid DEX SR", () => {
    expect(getUnloadedMissileSrDisplay(1)).toEqual(["RELOAD", "6", "RELOAD", "12"]);
    expect(getUnloadedMissileSr(1)).toBe("6,12");
  });

  it("returns empty values for undefined or out of range DEX SR", () => {
    expect(getLoadedMissileSrDisplay(undefined)).toEqual([]);
    expect(getLoadedMissileSr(99)).toBe("");
    expect(getUnloadedMissileSrDisplay(99)).toEqual([]);
    expect(getUnloadedMissileSr(undefined)).toBe("");
  });
});

describe("getBaseStrikeRank", () => {
  it("adds DEX SR and SIZ SR", () => {
    expect(getBaseStrikeRank(2, 3)).toBe(5);
  });

  it("returns undefined when both values are undefined", () => {
    expect(getBaseStrikeRank(undefined, undefined)).toBeUndefined();
  });

  it("handles one missing value", () => {
    expect(getBaseStrikeRank(4, undefined)).toBe(4);
    expect(getBaseStrikeRank(undefined, 6)).toBe(6);
  });
});

describe("calcCurrencyTotals", () => {
  it("sums quantity, prices and carried encumbrance and sets conversion text", () => {
    const actor = actorWithItems([
      {
        type: ItemTypeEnum.Gear,
        name: "Lunar",
        system: {
          physicalItemType: "currency",
          quantity: 3,
          equippedStatus: "equipped",
          encumbrance: 0.1,
          price: { real: 1, estimated: 1 },
        },
      },
      {
        type: ItemTypeEnum.Gear,
        name: "Silver",
        system: {
          physicalItemType: "currency",
          quantity: 2,
          equippedStatus: "notCarried",
          encumbrance: 0.2,
          price: { real: 0.2, estimated: 0.5 },
        },
      },
      {
        type: ItemTypeEnum.Gear,
        name: "Wheels",
        system: {
          physicalItemType: "currency",
          quantity: 4,
          equippedStatus: "carried",
          encumbrance: 0.25,
          price: { real: 2, estimated: 2 },
        },
      },
      {
        type: ItemTypeEnum.Gear,
        name: "Rations",
        system: {
          physicalItemType: "other",
          quantity: 9,
          equippedStatus: "equipped",
          encumbrance: 0.1,
          price: { real: 1, estimated: 1 },
        },
      },
    ]);

    const result = calcCurrencyTotals(actor);

    expect(result).toEqual({
      quantity: 9,
      price: {
        real: 11.4,
        estimated: 12,
      },
      encumbrance: 1.3,
    });

    expect(actor.items[0].system.price.conversion).toContain(
      "RQG.Actor.Gear.CurrencyConversionTipLunar",
    );
    expect(actor.items[1].system.price.conversion).toContain(
      "RQG.Actor.Gear.CurrencyConversionTipUnder1",
    );
    expect(actor.items[2].system.price.conversion).toContain(
      "RQG.Actor.Gear.CurrencyConversionTipOver1",
    );
  });
});

describe("getMainCultInfo", () => {
  it("uses the cult with highest rune points and marks multiple cults", () => {
    const actor = actorWithItems([
      {
        id: "cult-low",
        type: ItemTypeEnum.Cult,
        name: "Minor Cult",
        system: {
          runePoints: { max: 2 },
          joinedCults: [{ rank: "layMember" }],
          descriptionRqidLink: { rqid: "je..minor-cult" },
        },
      },
      {
        id: "cult-main",
        type: ItemTypeEnum.Cult,
        name: "Main Cult",
        system: {
          runePoints: { max: 7 },
          joinedCults: [{ rank: "initiate" }],
          descriptionRqidLink: { rqid: "je..main-cult" },
        },
      },
    ]);

    const result = getMainCultInfo(actor);

    expect(result.name).toBe("Main Cult");
    expect(result.id).toBe("cult-main");
    expect(result.hasMultipleCults).toBe(true);
    expect(result.descriptionRqid).toBe("je..main-cult");
    expect(result.rank).toContain("RQG.Actor.RuneMagic.CultRank.initiate");
  });
});

describe("spirit magic and free INT", () => {
  it("sums spirit magic points for non-matrix spells", () => {
    const actor = actorWithItems([
      { type: ItemTypeEnum.SpiritMagic, system: { points: 2, isMatrix: false } },
      { type: ItemTypeEnum.SpiritMagic, system: { points: 3, isMatrix: true } },
      { type: ItemTypeEnum.SpiritMagic, system: { points: 4, isMatrix: false } },
      {
        type: ItemTypeEnum.Skill,
        system: { category: SkillCategoryEnum.Magic, runeRqidLinks: [] },
      },
    ]);

    expect(getSpiritMagicPointSum(actor)).toBe(6);
  });

  it("calculates free INT as INT minus spirit points and sorcery skill count", () => {
    const actor = actorWithItems([
      {
        type: ItemTypeEnum.Skill,
        system: { category: SkillCategoryEnum.Magic, runeRqidLinks: [{ rqid: "i.rune.fire" }] },
      },
      {
        type: ItemTypeEnum.Skill,
        system: { category: SkillCategoryEnum.Magic, runeRqidLinks: [{ rqid: "i.rune.air" }] },
      },
      {
        type: ItemTypeEnum.Skill,
        system: { category: SkillCategoryEnum.Agility, runeRqidLinks: [{ rqid: "i.rune.earth" }] },
      },
    ]);

    expect(getFreeInt(actor, 4)).toBe(7);
  });
});

describe("getPowCrystals", () => {
  it("returns undefined when no applied effects exist", () => {
    const actor = actorWithItems([]);
    actor.appliedEffects = undefined;

    expect(getPowCrystals(actor)).toBeUndefined();
  });

  it("extracts names and summed crystal size from active effects", () => {
    const actor = actorWithItems([]);
    actor.appliedEffects = [
      {
        name: "Crystal A",
        changes: [
          { key: "system.attributes.magicPoints.max", value: "3" },
          { key: "system.attributes.hitPoints.max", value: "2" },
        ],
      },
      {
        name: "Crystal B",
        changes: [{ key: "system.attributes.magicPoints.max", value: 1 }],
      },
    ];

    expect(getPowCrystals(actor)).toEqual([
      { name: "Crystal A", size: 3 },
      { name: "Crystal B", size: 1 },
    ]);
  });
});

describe("rune image selectors", () => {
  it("filters and sorts element runes by chance", () => {
    const actor = actorWithItems([
      {
        id: "e-low",
        img: "earth.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Element },
          rune: "Earth",
          chance: 20,
          descriptionRqidLink: { rqid: "i.rune.earth" },
        },
      },
      {
        id: "e-high",
        img: "air.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Element },
          rune: "Air",
          chance: 90,
          descriptionRqidLink: { rqid: "i.rune.air" },
        },
      },
      {
        id: "p-high",
        img: "truth.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Power },
          rune: "Truth",
          chance: 75,
          descriptionRqidLink: { rqid: "i.rune.truth" },
        },
      },
    ]);

    const result = getCharacterElementRuneImgs(actor);

    expect(result.map((r) => r.id)).toEqual(["e-high", "e-low"]);
  });

  it("returns only power runes above 50%", () => {
    const actor = actorWithItems([
      {
        id: "p-low",
        img: "illusion.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Power },
          rune: "Illusion",
          chance: 50,
          descriptionRqidLink: { rqid: "i.rune.illusion" },
        },
      },
      {
        id: "p-high",
        img: "truth.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Power },
          rune: "Truth",
          chance: 51,
          descriptionRqidLink: { rqid: "i.rune.truth" },
        },
      },
    ]);

    const result = getCharacterPowerRuneImgs(actor);

    expect(result.map((r) => r.id)).toEqual(["p-high"]);
  });

  it("returns form runes with chance > 50 or no opposing rune", () => {
    const actor = actorWithItems([
      {
        id: "f-pass",
        img: "beast.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Form },
          rune: "Beast",
          chance: 60,
          opposingRuneRqidLink: { rqid: "i.rune.man" },
          descriptionRqidLink: { rqid: "i.rune.beast" },
        },
      },
      {
        id: "f-no-opposing",
        img: "man.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Form },
          rune: "Man",
          chance: 10,
          opposingRuneRqidLink: undefined,
          descriptionRqidLink: { rqid: "i.rune.man" },
        },
      },
      {
        id: "f-fail",
        img: "plant.png",
        type: ItemTypeEnum.Rune,
        system: {
          runeType: { type: RuneTypeEnum.Form },
          rune: "Plant",
          chance: 25,
          opposingRuneRqidLink: { rqid: "i.rune.beast" },
          descriptionRqidLink: { rqid: "i.rune.plant" },
        },
      },
    ]);

    const result = getCharacterFormRuneImgs(actor);

    expect(result.map((r) => r.id)).toEqual(["f-pass", "f-no-opposing"]);
  });
});

describe("getHitLocationDiceRangeError", () => {
  it("returns empty string when hit locations cover 1-20 exactly", () => {
    const actor = actorWithItems([
      { type: ItemTypeEnum.HitLocation, system: { dieFrom: 1, dieTo: 5 } },
      { type: ItemTypeEnum.HitLocation, system: { dieFrom: 6, dieTo: 10 } },
      { type: ItemTypeEnum.HitLocation, system: { dieFrom: 11, dieTo: 15 } },
      { type: ItemTypeEnum.HitLocation, system: { dieFrom: 16, dieTo: 20 } },
    ]);

    expect(getHitLocationDiceRangeError(actor)).toBe("");
  });

  it("returns localized error string for invalid ranges", () => {
    const actor = actorWithItems([
      { type: ItemTypeEnum.HitLocation, system: { dieFrom: 1, dieTo: 10 } },
      { type: ItemTypeEnum.HitLocation, system: { dieFrom: 11, dieTo: 19 } },
    ]);

    const result = getHitLocationDiceRangeError(actor);

    expect(result).toContain("RQG.Actor.Health.HitLocationDiceDoNotAddUp");
  });
});
