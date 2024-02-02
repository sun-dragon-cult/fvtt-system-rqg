import type { RqgItem } from "../items/rqgItem";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { actorHealthStatuses } from "../data-model/actor-data/attributes";
import { RuneDataSource } from "../data-model/item-data/runeData";
import { LocationItemNodeData } from "../items/shared/locationItemNode";

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

export interface MainCult {
  name: string;
  id: string;
  rank: string;
  descriptionRqid: string;
  hasMultipleCults: boolean;
}

export interface CharacterSheetData {
  uuid: string;
  /** reorganized for presentation TODO type it better */
  embeddedItems: any;

  /** Find this skill to show on spirit combat part */
  spiritCombatSkillData: any;
  /** Find this skill to show on combat part */
  dodgeSkillData: RqgItem | undefined;

  // Lists for dropdown values
  occupations: `${OccupationEnum}`[];
  homelands: `${HomeLandEnum}`[];
  locations: string[];
  healthStatuses: typeof actorHealthStatuses;

  // Other data needed for the sheet
  mainCult: MainCult;
  /** Array of element runes with > 0% chance */
  characterElementRunes: RuneDataSource[];
  characterPowerRunes: RuneDataSource[];
  characterFormRunes: RuneDataSource[];
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
  ownedProjectiles: RqgItem[];
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
