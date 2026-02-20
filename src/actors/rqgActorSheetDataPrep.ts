import type { CharacterActor } from "../data-model/actor-data/rqgActorData";
import type { Characteristics } from "../data-model/actor-data/characteristics";
import type {
  MainCult,
  SheetRuneData,
  UiSections,
  TemplateGearItem,
  TemplateWeaponItem,
} from "./rqgActorSheet.types";
import type { RqgItem } from "../items/rqgItem";
import type { GearItem } from "@item-model/gearData.ts";
import type { CultItem } from "@item-model/cultData.ts";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import type { SkillItem } from "@item-model/skillData.ts";
import { SkillCategoryEnum } from "@item-model/skillData.ts";
import type { RuneItem } from "@item-model/runeData.ts";
import { RuneTypeEnum } from "@item-model/runeData.ts";
import type { HitLocationItem } from "@item-model/hitLocationData.ts";
import type { WeaponItem } from "@item-model/weaponData.ts";
import type { PassionItem } from "@item-model/passionData.ts";
import {
  assertDocumentSubType,
  formatListByWorldLanguage,
  getItemDocumentTypes,
  isDocumentSubType,
  localize,
  range,
} from "../system/util";
import { CultRankEnum } from "@item-model/cultData.ts";
import { ItemTypeEnum, type PhysicalItem } from "@item-model/itemTypes.ts";
import { physicalItemTypes } from "../data-model/item-data/IPhysicalItem";
import { systemId } from "../system/config";
import { documentRqidFlags } from "../data-model/shared/rqgDocumentFlags";

/**
 * Ranks characteristics from their formula, returning CSS class names for styling.
 * @param actor - The character actor
 * @returns Record of characteristic names to CSS class strings
 */
export async function rankCharacteristics(actor: CharacterActor): Promise<any> {
  const result = {} as { [key: string]: string };
  for (const characteristic of Object.keys(actor.system.characteristics)) {
    const rankClass = "characteristic-rank-";
    const char = actor.system.characteristics[characteristic as keyof Characteristics];

    // TODO bug? should it be `result[characteristic] = ""`
    if (char == null || char.value == null || char.formula == null || char.formula == "") {
      // cannot evaluate
      result["characteristic"] = "";
      continue;
    }

    if (Number.isNumeric(char.formula)) {
      // formula is a literal number and does not need evaluation
      result["characteristic"] = "";
      continue;
    }

    if (!Roll.validate(char.formula)) {
      // formula is not valid and cannnot be evaluated
      result["characteristic"] = "";
      continue;
    }

    const minRoll = new Roll(char.formula || "");
    await minRoll.evaluate({ minimize: true });
    const minTotal = minRoll.total;
    const maxRoll = new Roll(char.formula || "");
    await maxRoll.evaluate({ maximize: true });
    const maxTotal = maxRoll.total;

    if (minTotal == null || maxTotal == null) {
      // cannot evaluate
      result["characteristic"] = "";
      continue;
    }

    if (char.value < minTotal) {
      result[characteristic] = rankClass + "low";
      continue;
    }

    if (char.value > maxTotal) {
      result[characteristic] = rankClass + "high";
      continue;
    }

    // the tens value of the percentage of the value compared to the maxTotal
    const rank = Math.floor(((char.value - minTotal) / (maxTotal - minTotal)) * 10);

    result[characteristic] = rankClass + rank;
  }
  return result;
}

/**
 * Calculates currency totals and adds conversion tooltips to currency items.
 * @param actor - The character actor
 * @returns Object with quantity, price, and encumbrance totals
 */
export function calcCurrencyTotals(actor: CharacterActor): any {
  const currency = actor.items.filter(
    (i) =>
      isDocumentSubType<GearItem>(i, ItemTypeEnum.Gear) && i.system.physicalItemType === "currency",
  ) as GearItem[];
  const result = { quantity: 0, price: { real: 0, estimated: 0 }, encumbrance: 0 };
  currency.forEach((curr) => {
    assertDocumentSubType<GearItem>(curr, ItemTypeEnum.Gear);
    result.quantity += Number(curr.system.quantity);
    result.price.real += curr.system.price.real * curr.system.quantity;
    result.price.estimated += curr.system.price.estimated * curr.system.quantity;
    if (curr.system.equippedStatus !== "notCarried") {
      result.encumbrance += curr.system.encumbrance * curr.system.quantity;
    }
    let conv;
    if (curr.system.price.estimated > 1) {
      conv = localize("RQG.Actor.Gear.CurrencyConversionTipOver1", {
        name: curr.name,
        value: curr.system.price.estimated.toString(),
      });
    } else if (curr.system.price.estimated === 1) {
      conv = localize("RQG.Actor.Gear.CurrencyConversionTipLunar");
    } else {
      conv = localize("RQG.Actor.Gear.CurrencyConversionTipUnder1", {
        name: curr.name,
        value: (1 / curr.system.price.estimated).toString(),
      });
    }
    const templateGear = curr as TemplateGearItem;
    templateGear.system.price.conversion = conv;
  });
  return result;
}

/**
 * Gets information about the actor's main cult.
 * @param actor - The character actor
 * @returns MainCult information
 */
export function getMainCultInfo(actor: CharacterActor): MainCult {
  const cults = actor.items
    .filter((i) => isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult))
    .sort((a, b) => (b.system.runePoints.max ?? 0) - (a.system.runePoints.max ?? 0)) as CultItem[];
  const mainCultItem = cults[0];
  const mainCultRankTranslation =
    mainCultItem?.system?.joinedCults.map((c) =>
      c.rank ? localize("RQG.Actor.RuneMagic.CultRank." + c.rank) : "",
    ) ?? [];
  return {
    name: mainCultItem?.name ?? "",
    id: mainCultItem?.id ?? "",
    rank: formatListByWorldLanguage(mainCultRankTranslation),
    descriptionRqid: mainCultItem?.system?.descriptionRqidLink?.rqid ?? "",
    hasMultipleCults: cults.length > 1,
  };
}

/**
 * Calculates the sum of spirit magic points invested in spells (not in matrices).
 * @param actor - The character actor
 * @returns Total spirit magic points
 */
export function getSpiritMagicPointSum(actor: CharacterActor): number {
  return actor.items.reduce((acc: number, item) => {
    if (
      isDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic) &&
      !item.system.isMatrix
    ) {
      return acc + item.system.points;
    } else {
      return acc;
    }
  }, 0);
}

/**
 * Gets list of POW crystals from active effects.
 * @param actor - The character actor
 * @returns Array of POW crystals with name and size
 */
export function getPowCrystals(actor: CharacterActor): { name: string; size: number }[] {
  return (
    actor.appliedEffects &&
    actor.appliedEffects
      .filter(
        (e) =>
          e.changes.find((e: any) => e.key === "system.attributes.magicPoints.max") != undefined,
      )
      .map((e) => {
        return {
          name: e.name ?? "",
          size: e.changes
            .filter((c: any) => c.key === "system.attributes.magicPoints.max")
            .reduce((acc: number, c: any) => acc + Number(c.value), 0),
        };
      })
  );
}

/**
 * Calculates free INT (INT - spirit magic points - sorcery spells).
 * @param actor - The character actor  * @param spiritMagicPointSum - Total spirit magic points invested
 * @returns Free INT available
 */
export function getFreeInt(actor: CharacterActor, spiritMagicPointSum: number): number {
  return (
    (actor.system.characteristics.intelligence.value ?? 0) -
    spiritMagicPointSum -
    actor.items.filter(
      (i) =>
        isDocumentSubType<SkillItem>(i, ItemTypeEnum.Skill) &&
        i.system.category === SkillCategoryEnum.Magic &&
        !!i.system.runeRqidLinks?.length,
    ).length
  );
}

/**
 * Gets display values for loaded missile weapon strike ranks.
 * @param dexSr - Dexterity strike rank
 * @returns Array of SR display strings with reload icons
 */
export function getLoadedMissileSrDisplay(dexSr: number | undefined): string[] {
  const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
  const loadedMissileSr = [
    ["1", reloadIcon, "6", reloadIcon, "11"],
    ["1", reloadIcon, "7", reloadIcon],
    ["2", reloadIcon, "9"],
    ["3", reloadIcon, "11"],
    ["4", reloadIcon],
    ["5", reloadIcon],
  ];
  return dexSr != null ? (loadedMissileSr[dexSr] ?? []) : [];
}

/**
 * Gets comma-separated loaded missile weapon strike ranks.
 * @param dexSr - Dexterity strike rank
 * @returns Comma-separated SR string
 */
export function getLoadedMissileSr(dexSr: number | undefined): string {
  const loadedMissileSr = ["1,6,11", "1,7", "2,9", "3,11", "4", "5"];
  return dexSr != null ? (loadedMissileSr[dexSr] ?? "") : "";
}

/**
 * Gets display values for unloaded missile weapon strike ranks.
 * @param dexSr - Dexterity strike rank
 * @returns Array of SR display strings with reload icons
 */
export function getUnloadedMissileSrDisplay(dexSr: number | undefined): string[] {
  const reloadIcon = CONFIG.RQG.missileWeaponReloadIcon;
  const unloadedMissileSr = [
    [reloadIcon, "5", reloadIcon, "10"],
    [reloadIcon, "6", reloadIcon, "12"],
    [reloadIcon, "7", reloadIcon],
    [reloadIcon, "8"],
    [reloadIcon, "9"],
    [reloadIcon, "10"],
  ];
  return dexSr != null ? (unloadedMissileSr[dexSr] ?? []) : [];
}

/**
 * Gets comma-separated unloaded missile weapon strike ranks.
 * @param dexSr - Dexterity strike rank
 * @returns Comma-separated SR string
 */
export function getUnloadedMissileSr(dexSr: number | undefined): string {
  const unloadedMissileSr = ["5,10", "6,12", "7", "8", "9", "10"];
  return dexSr != null ? (unloadedMissileSr[dexSr] ?? "") : "";
}

/**
 * Calculates the base strike rank (DEX SR + SIZ SR).
 * @param dexStrikeRank - Dexterity strike rank
 * @param sizStrikeRank - Size strike rank
 * @returns Base strike rank or undefined if both inputs are undefined
 */
export function getBaseStrikeRank(
  dexStrikeRank: number | undefined,
  sizStrikeRank: number | undefined,
): number | undefined {
  if (dexStrikeRank == null && sizStrikeRank == null) {
    return undefined;
  }

  return [dexStrikeRank, sizStrikeRank].reduce(
    (acc: number, value: number | undefined) => (Number(value) ? acc + Number(value) : acc),
    0,
  );
}

/**
 * Gets element runes with a chance > 0, sorted by chance descending.
 * @param actor - The character actor
 * @returns Array of element rune data
 */
export function getCharacterElementRuneImgs(actor: CharacterActor): SheetRuneData[] {
  return actor.items
    .reduce((acc: SheetRuneData[], i) => {
      if (
        isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune) &&
        i.system.runeType.type === RuneTypeEnum.Element &&
        !!i.system.chance
      ) {
        acc.push({
          id: i.id,
          img: i.img,
          rune: i.system.rune,
          chance: i.system.chance,
          descriptionRqid: i.system.descriptionRqidLink?.rqid,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.chance - a.chance);
}

/**
 * Gets power runes with a chance > 50%, sorted by chance descending.
 * @param actor - The character actor
 * @returns Array of power rune data
 */
export function getCharacterPowerRuneImgs(actor: CharacterActor): SheetRuneData[] {
  return actor.items
    .reduce((acc: SheetRuneData[], i) => {
      if (
        isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune) &&
        i.system.runeType.type === RuneTypeEnum.Power &&
        i.system.chance > 50
      ) {
        acc.push({
          id: i.id,
          img: i.img,
          rune: i.system.rune,
          chance: i.system.chance,
          descriptionRqid: i.system.descriptionRqidLink?.rqid,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.chance - a.chance);
}

/**
 * Gets form runes that define the character (> 50% or no opposing rune).
 * @param actor - The character actor
 * @returns Array of form rune data
 */
export function getCharacterFormRuneImgs(actor: CharacterActor): SheetRuneData[] {
  return actor.items
    .reduce((acc: SheetRuneData[], i) => {
      if (
        isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune) &&
        i.system.runeType.type === RuneTypeEnum.Form &&
        (!i.system.opposingRuneRqidLink?.rqid || i.system.chance > 50)
      ) {
        acc.push({
          id: i.id,
          img: i.img,
          rune: i.system.rune,
          chance: i.system.chance,
          descriptionRqid: i.system.descriptionRqidLink?.rqid,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.chance - a.chance);
}

/**
 * Validates that hit location dice ranges cover 1-20 exactly once.
 * @param actor - The character actor
 * @returns Error message string, or empty string if valid
 */
export function getHitLocationDiceRangeError(actor: CharacterActor): string {
  const hitLocations = actor.items.filter((i) =>
    isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation),
  ) as HitLocationItem[];
  if (hitLocations.length === 0) {
    return ""; // No hit locations is a valid state
  }
  const ranges = hitLocations.flatMap((hl) => [...range(hl.system.dieFrom, hl.system.dieTo)]);
  if (ranges.length === 20 && [...range(1, 20)].every((die) => ranges.includes(die))) {
    return "";
  } else {
    const sortedRanges = ranges.sort((a, b) => a - b);
    return localize("RQG.Actor.Health.HitLocationDiceDoNotAddUp", {
      dice: sortedRanges.join(", "),
    });
  }
}

/**
 * Organizes actor's embedded items for presentation in the sheet.
 * Separates items by type, enriches descriptions, adds display data.
 * @param actor - The character actor
 * @param incorrectRunes - Array to populate with invalid runes (modified in place)
 * @returns Organized items object keyed by item type
 */
export async function organizeEmbeddedItems(
  actor: CharacterActor,
  incorrectRunes: RqgItem[],
): Promise<any> {
  const itemTypes: { [type: string]: RqgItem[] } = Object.fromEntries(
    getItemDocumentTypes().map((t) => [t, []]),
  );
  actor.items.forEach((item) => {
    itemTypes[item.type]?.push(item as RqgItem);
  });

  const currency: any = [];
  actor.items.forEach((item) => {
    if (
      isDocumentSubType<GearItem>(item, ItemTypeEnum.Gear) &&
      item.system.physicalItemType === "currency"
    ) {
      currency.push(item);
    }
  });

  currency.sort(
    (a: any, b: any) =>
      (Number(a.system.price.estimated) < Number(b.system.price.estimated) ? 1 : -1) - 1,
  );

  itemTypes["currency"] = currency;

  // Separate skills into skill categories {agility: [RqgItem], communication: [RqgItem], ... }
  const skills: any = {};
  Object.values(SkillCategoryEnum).forEach((cat: string) => {
    skills[cat] = itemTypes[ItemTypeEnum.Skill]?.filter(
      (skill: any) => cat === skill.system.category,
    );
  });
  // Sort the skills inside each category
  Object.values(skills).forEach((skillList) =>
    (skillList as RqgItem[]).sort((a: RqgItem, b: RqgItem) =>
      ("" + a.name).localeCompare("" + b.name),
    ),
  );
  itemTypes[ItemTypeEnum.Skill] = skills;

  // Prepare the object to hold the runes per runeType
  const resultObject = {
    [RuneTypeEnum.Element]: {},
    [RuneTypeEnum.Power]: {},
    [RuneTypeEnum.Form]: {},
    [RuneTypeEnum.Condition]: {},
    [RuneTypeEnum.Technique]: {},
  };

  // Separate runes into types (elemental, power, form, technique)
  itemTypes[ItemTypeEnum.Rune] = itemTypes[ItemTypeEnum.Rune]?.reduce((acc: any, rune: any) => {
    const runeRqidName = rune.flags?.rqg?.documentRqidFlags?.id
      ?.split(".")
      .pop()
      .split("-")
      .shift();
    const runeType = rune?.system.runeType.type;
    if (Object.values(RuneTypeEnum).includes(runeType)) {
      acc[runeType][runeRqidName] = rune;
    } else {
      incorrectRunes.push(rune);
    }
    return acc;
  }, resultObject);

  // Sort the hit locations
  if (game.settings?.get(systemId, "sortHitLocationsLowToHigh")) {
    itemTypes[ItemTypeEnum.HitLocation]?.sort(
      (a: any, b: any) => a.system.dieFrom - b.system.dieFrom,
    );
  } else {
    itemTypes[ItemTypeEnum.HitLocation]?.sort(
      (a: any, b: any) => b.system.dieFrom - a.system.dieFrom,
    );
  }

  // Arrange wounds for display & add last rqid part
  itemTypes[ItemTypeEnum.HitLocation] =
    itemTypes[ItemTypeEnum.HitLocation]?.map((hitLocation: any) => {
      hitLocation.system.woundsString = hitLocation.system.wounds.join("+");
      hitLocation.rqidName = hitLocation.flags?.rqg?.documentRqidFlags?.id?.split(".")[2] ?? "";
      return hitLocation;
    }) ?? [];

  // Enrich Cult texts for holyDays, gifts & geases
  await Promise.all(
    itemTypes[ItemTypeEnum.Cult]?.map(async (cult: any) => {
      cult.system.enrichedHolyDays =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(cult.system.holyDays);
      cult.system.enrichedGifts =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(cult.system.gifts);
      cult.system.enrichedGeases =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(cult.system.geases);
    }) ?? [],
  );

  // Extract hasAccessToRuneMagic info from subCults
  itemTypes[ItemTypeEnum.Cult]?.map(async (cult: any) => {
    cult.hasAccessToRuneMagic = cult.system.joinedCults.some(
      (subCult: any) => subCult.rank !== CultRankEnum.LayMember,
    );
    return cult;
  });

  // Enrich passion description texts
  await Promise.all(
    itemTypes[ItemTypeEnum.Passion]?.map(async (passion: any) => {
      passion.system.enrichedDescription =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          passion.system.description,
        );
    }) ?? [],
  );

  // Add extra info for Rune Magic Spells
  itemTypes[ItemTypeEnum.RuneMagic]?.forEach((runeMagic: any) => {
    const spellCult = actor.items.get(runeMagic.system.cultId) as CultItem | undefined;
    const cultCommonRuneMagicRqids =
      spellCult?.system.commonRuneMagicRqidLinks.map((r) => r.rqid) ?? [];

    runeMagic.system.isCommon = cultCommonRuneMagicRqids.includes(
      runeMagic?.flags?.rqg?.documentRqidFlags?.id ?? "",
    );
  });

  // Add weapon data
  itemTypes[ItemTypeEnum.Weapon]?.forEach((weapon: RqgItem) => {
    assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);

    const usages = weapon.system.usage;
    const actorStr = actor.system.characteristics.strength.value ?? 0;
    const actorDex = actor.system.characteristics.dexterity.value ?? 0;
    // TODO extra data is added to the Usage object for the sheet, look at typing
    for (const usage of Object.values(usages) as any) {
      if (!foundry.utils.isEmpty(usage?.skillRqidLink?.rqid)) {
        usage.skillId = actor.getBestEmbeddedDocumentByRqid(usage.skillRqidLink.rqid)?.id;
        usage.unusable = false;
        usage.underMinSTR = false;
        usage.underMinDEX = false;
        if (actorStr < usage.minStrength) {
          usage.underMinSTR = true;
        }
        if (actorDex < usage.minDexterity) {
          usage.underMinDEX = true;
        }
        if (usage.underMinSTR) {
          usage.unusable = true;
        }
        if (usage.underMinDEX) {
          // STR can compensate for being under DEX min on 2 for 1 basis
          const deficiency = usage.minDexterity - actorDex;
          const strover = Math.floor((actorStr - usage.minStrength) / 2);
          if (usage.minStrength == null) {
            usage.unusable = true;
          } else {
            usage.unusable = deficiency > strover;
          }
        }
      }
    }

    const projectile = actor.items.find((i) => i.id === weapon.system.projectileId) as
      | WeaponItem
      | undefined;
    if (projectile) {
      const templateWeapon = weapon as TemplateWeaponItem;
      templateWeapon.system.projectileQuantity = projectile.system.quantity;
      templateWeapon.system.projectileName = projectile.name;
    }
  });
  itemTypes[ItemTypeEnum.Armor]?.sort((a, b) => a.sort - b.sort);
  itemTypes[ItemTypeEnum.Gear]?.sort((a, b) => a.sort - b.sort);
  itemTypes[ItemTypeEnum.Passion]?.sort((a, b) => a.sort - b.sort);
  itemTypes[ItemTypeEnum.RuneMagic]?.sort((a, b) => a.sort - b.sort);
  itemTypes[ItemTypeEnum.SpiritMagic]?.sort((a, b) => a.sort - b.sort);
  itemTypes[ItemTypeEnum.Weapon]?.sort((a, b) => a.sort - b.sort);

  itemTypes[ItemTypeEnum.Cult]?.sort(
    (a, b) =>
      ((b as CultItem).system.runePoints?.max ?? 0) - ((a as CultItem).system.runePoints?.max ?? 0),
  );

  return itemTypes;
}

/**
 * Determines which UI sections should be visible based on actor's items.
 * @param actor - The character actor
 * @returns UiSections with boolean flags for each section
 */
export function getUiSectionVisibility(actor: CharacterActor): UiSections {
  return {
    health:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.system.attributes.hitPoints.max != null ||
      actor.items.some((i) => isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation)),
    combat:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some(
        (i) =>
          isDocumentSubType<WeaponItem>(i, ItemTypeEnum.Weapon) ||
          i.getFlag(systemId, documentRqidFlags)?.id === CONFIG.RQG.skillRqid.dodge,
      ),
    runes:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some((i) => isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune)),
    spiritMagic:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some((i) => isDocumentSubType<SpiritMagicItem>(i, ItemTypeEnum.SpiritMagic)),
    runeMagic:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some((i) => [ItemTypeEnum.Cult, ItemTypeEnum.RuneMagic].includes(i.type)),
    sorcery:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some(
        (i) =>
          isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune) &&
          (i.system.isMastered || i.system.runeType.type === RuneTypeEnum.Technique),
      ),
    skills:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some((i) => isDocumentSubType<SkillItem>(i, ItemTypeEnum.Skill)),
    gear:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some((i) => {
        const isPhysical = isDocumentSubType<PhysicalItem>(i, physicalItemTypes);
        const isNaturalWeapon = (i.system as any).isNatural;
        return isPhysical && !isNaturalWeapon;
      }),
    passions:
      CONFIG.RQG.debug.showAllUiSections ||
      actor.items.some((i) => isDocumentSubType<PassionItem>(i, ItemTypeEnum.Passion)),
    background: true,
    activeEffects: (CONFIG.RQG.debug.showActorActiveEffectsTab && game.user?.isGM) ?? false,
  };
}

/**
 * Gets enriched HTML warning text for unspecified skills.
 * @param actor - The character actor
 * @returns Enriched HTML string or undefined if no unspecified skills
 */
export async function getUnspecifiedSkillText(actor: CharacterActor): Promise<string | undefined> {
  const unspecifiedSkills = actor.items.filter(
    (i) =>
      isDocumentSubType<SkillItem>(i, ItemTypeEnum.Skill) &&
      !!i.name &&
      i.system?.specialization === "...",
  ) as SkillItem[];
  if (unspecifiedSkills.length) {
    const itemLinks = unspecifiedSkills.map((s) => s.link).join(" ");
    const warningText = localize("RQG.Actor.Skill.UnspecifiedSkillWarning");
    return await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      `${warningText} ${itemLinks}`,
    );
  }
}

/**
 * Gets enriched HTML warning text for incorrect runes.
 * @param actor - The character actor
 * @param embeddedRunes - Organized runes object from organizeEmbeddedItems
 * @param incorrectRunes - Array of incorrect runes from organizeEmbeddedItems
 * @returns Enriched HTML string or undefined if no incorrect runes
 */
export async function getIncorrectRunesText(
  actor: CharacterActor,
  embeddedRunes: any,
  incorrectRunes: RqgItem[],
): Promise<string | undefined> {
  const validRuneIds = [
    ...Object.values(embeddedRunes.element).map((r: any) => r.id),
    Object.values(embeddedRunes.form).map((r: any) => r.id),
    Object.values(embeddedRunes.condition).map((r: any) => r.id),
    Object.values(embeddedRunes.technique).map((r: any) => r.id),
    Object.values(embeddedRunes.power)
      .filter((r: any) => {
        const runeRqidName = r?.flags?.rqg?.documentRqidFlags?.id
          ?.split(".")
          .pop()
          .split("-")
          .shift();
        return [
          "fertility",
          "death",
          "harmony",
          "disorder",
          "truth",
          "illusion",
          "stasis",
          "movement",
        ].includes(runeRqidName);
      })
      .map((r: any) => r.id),
  ].flat(Infinity);
  const extraRunes = actor.items.filter(
    (i) => isDocumentSubType<RuneItem>(i, ItemTypeEnum.Rune) && !validRuneIds.includes(i.id),
  );
  embeddedRunes.invalid = extraRunes;

  if (incorrectRunes.length) {
    // incorrectRunes is initialised as a side effect in the organizeEmbeddedItems method
    const itemLinks = incorrectRunes.map((s) => s.link).join(" ");
    const warningText = localize("RQG.Actor.Rune.IncorrectRuneWarning");
    return await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      `${warningText} ${itemLinks}`,
    );
  }
}

/**
 * Gets equipped projectile options for weapon selection dropdown.
 * @param actor - The character actor
 * @returns Array of select options with id and display string
 */
export function getEquippedProjectileOptions(actor: CharacterActor): SelectOptionData<string>[] {
  return [
    { value: "", label: localize("RQG.Actor.Combat.ProjectileWeaponAmmoNotSelectedAlert") },
    ...actor
      .getEmbeddedCollection("Item")
      .filter(
        (i: RqgItem) =>
          isDocumentSubType<WeaponItem>(i, ItemTypeEnum.Weapon) &&
          i.system.isProjectile &&
          i.system.equippedStatus === "equipped",
      )
      .map((i: any) => ({
        value: i.id ?? "",
        label: `${i.name ?? ""} (${i.system.quantity})`,
      })),
  ];
}
