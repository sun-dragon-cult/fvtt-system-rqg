import type { RqgItem } from "../items/rqgItem";
import type { ActorSheetData } from "@items/shared/sheetInterfaces.types.ts";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { actorHealthStatuses } from "../data-model/actor-data/attributes";
import type { LocationItemNodeData } from "../items/shared/locationItemNode";
import type { GearItem } from "@item-model/gearData.ts";
import type { WeaponItem } from "@item-model/weaponData.ts";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";

/**
 * UI section visibility flags for actor sheet tabs and sections.
 */
export interface UiSections {
  health: boolean;
  combat: boolean;
  runes: boolean;
  spiritMagic: boolean;
  runeMagic: boolean;
  sorcery: boolean;
  skills: boolean;
  gear: boolean;
  passions: boolean;
  background: boolean;
  activeEffects: boolean;
}

/**
 * Main cult information for display on actor sheet.
 */
export interface MainCult {
  name: string;
  id: string;
  rank: string;
  descriptionRqid: string;
  hasMultipleCults: boolean;
}

/**
 * Rune data prepared for sheet display.
 */
export interface SheetRuneData {
  id: string;
  rune: string;
  chance: number;
  img: string | undefined | null;
  descriptionRqid: string | undefined;
}

/**
 * Complete data structure passed to the actor sheet template.
 * This represents the getData() return type.
 */
export interface CharacterSheetData {
  uuid: string;
  /** reorganized for presentation TODO type it better */
  embeddedItems: any;

  /** Find this skill to show on spirit combat part */
  spiritCombatSkillData: any;
  /** Find this skill to show on combat part */
  dodgeSkillData: RqgItem | undefined;

  // Lists for dropdown values
  occupationOptions: SelectOptionData<OccupationEnum>[];
  homelands: `${HomeLandEnum}`[];
  locations: string[];
  healthStatuses: typeof actorHealthStatuses;

  // Other data needed for the sheet
  mainCult: MainCult;
  /** Array of element runes with > 0% chance */
  characterElementRunes: SheetRuneData[];
  characterPowerRunes: SheetRuneData[];
  characterFormRunes: SheetRuneData[];
  /** (html) Precalculated missile weapon SRs if loaded at start of round */
  loadedMissileSrDisplay: string[];
  loadedMissileSr: string;
  /** (html) Precalculated missile weapon SRs if not loaded at start of round */
  unloadedMissileSrDisplay: string[];
  unloadedMissileSr: string;
  /** physical items reorganised as a tree of items containing items */
  itemLocationTree: LocationItemNodeData;
  /** list of pow-crystals */
  powCrystals: { name: string; size: number }[];
  spiritMagicPointSum: number;
  freeInt: number;
  baseStrikeRank: number | undefined;
  enrichedAllies: string;
  enrichedBiography: string;
  ownedProjectileOptions: SelectOptionData<string>[];
  locomotionModes: { [a: string]: string };

  currencyTotals: any;
  isInCombat: boolean;
  dexSR: number[];
  sizSR: number[];
  otherSR: number[];
  activeInSR: number[]; // Store the SR (initiative) where this actor should have a combatant

  characteristicRanks: any;
  bodyType: string;
  hitLocationDiceRangeError: string;

  showHeropoints: boolean;
  showUiSection: UiSections;
  actorWizardFeatureFlag: boolean;
  itemLoopMessage: string | undefined;
  enrichedUnspecifiedSkill: string | undefined;
  enrichedIncorrectRunes: string | undefined;
}

/**
 * Gear item with currency conversion text added for template display.
 */
export interface TemplateGearItem extends GearItem {
  system: GearItem["system"] & {
    price: GearItem["system"]["price"] & {
      conversion?: string; // Currency conversion tooltip text
    };
  };
}

/**
 * Weapon item with projectile info added for template display.
 */
export interface TemplateWeaponItem extends WeaponItem {
  system: WeaponItem["system"] & {
    projectileQuantity?: number; // Quantity of loaded projectile
    projectileName?: string; // Name of loaded projectile
  };
}

/**
 * Complete template context returned by getData().
 * Combines CharacterSheetData with Foundry's ActorSheetData.
 */
export interface ActorSheetTemplateContext extends CharacterSheetData, ActorSheetData {
  embeddedItems: {
    [ItemTypeEnum.Gear]?: TemplateGearItem[];
    [ItemTypeEnum.Weapon]?: TemplateWeaponItem[];
    [key: string]: RqgItem[] | Record<string, RqgItem[]> | undefined;
  };
}
