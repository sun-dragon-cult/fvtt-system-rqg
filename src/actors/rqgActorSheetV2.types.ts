import type { SheetRuneData, MainCult, UiSections, CurrencyTotals } from "./rqgActorSheet.types";
import type { RuneOpposedPair } from "./rqgActorSheetDataPrep";
import type { RqgItem } from "../items/rqgItem";
import type { RuneItem } from "@item-model/runeDataModel.ts";
import type { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { CharacterActor } from "../data-model/actor-data/rqgActorData";
import type { LocationItemNodeData } from "../items/shared/locationItemNode";

/**
 * Context passed to all V2 actor sheet parts.
 */
export interface RqgActorSheetV2Context {
  id: string;
  uuid: string;
  name: string;
  img: string;
  isGM: boolean;
  isEditable: boolean;
  isEmbedded: boolean;
  system: CharacterActor["system"];
  effects: unknown;
  /** Tab data prepared by _prepareTabs, used by tab-navigation template. */
  tabs?: Record<string, foundry.applications.api.ApplicationV2.Tab>;
  /** Active tab for the current part, set by _preparePartContext. */
  tab?: foundry.applications.api.ApplicationV2.Tab;

  /** Embedded items organized by type (from DataPrep.organizeEmbeddedItems). */
  embeddedItems: {
    [key in ItemTypeEnum]?: RqgItem[] | Record<string, RqgItem[]>;
  };

  /** Physical items reorganized as a tree of items containing items. */
  itemLocationTree: LocationItemNodeData;
  /** Known item location names for datalist suggestions. */
  locations: string[];
  /** Currency totalized price and encumbrance values. */
  currencyTotals: CurrencyTotals;
  /** Warning text when item location tree has loops. */
  itemLoopMessage: string | undefined;
  /** Gear tab data split for conditional section rendering. */
  gearView: {
    unique: RqgItem[];
    consumable: RqgItem[];
    currency: RqgItem[];
    weapon: RqgItem[];
    armor: RqgItem[];
    hasUnique: boolean;
    hasConsumable: boolean;
    hasCurrency: boolean;
    hasWeapon: boolean;
    hasArmor: boolean;
  };

  /** Main cult for display in the header. */
  mainCult: MainCult;
  /** Sorted element runes with > 0% chance. */
  characterElementRunes: SheetRuneData[];
  /** Sorted power runes with > 50% chance. */
  characterPowerRunes: SheetRuneData[];
  /** Form runes that define the character. */
  characterFormRunes: SheetRuneData[];

  /** CSS strength class per element rune key (e.g. fire, air). */
  elementRuneVisuals: Record<string, { cls: string }>;

  /** Dynamically paired power runes (from opposingRuneRqidLink). */
  powerRunePairs: RuneOpposedPair[];
  /** Dynamically paired form runes (from opposingRuneRqidLink). */
  formRunePairs: RuneOpposedPair[];
  /** Form runes without an opposing rune. */
  formRuneStandalone: RuneItem[];

  /** Base strike rank (DEX SR + SIZ SR). */
  baseStrikeRank: number | undefined;

  /** Total spirit magic points memorized. */
  spiritMagicPointSum: number;
  /** INT remaining after spirit magic. */
  freeInt: number;

  /** POW crystals list. */
  powCrystals: { name: string; size: number }[];

  /** Enriched biography HTML. */
  enrichedBiography: string;
  /** Enriched allies/notes HTML. */
  enrichedAllies: string;

  /** Whether the user has enabled characteristic rating display. */
  showCharacteristicRatings: boolean;
  /** CSS class names per characteristic for rating display. */
  characteristicRanks: Record<string, string>;
  /** True when actor has GodTalker+ rank but POW < 18. */
  powWarning: boolean;
  /** Whether the sheet is in edit mode. */
  editMode: boolean;

  /** Warning text for incorrect/duplicate runes. */
  enrichedIncorrectRunes: string | undefined;

  /** Warning text for skills needing specialization. */
  enrichedUnspecifiedSkill: string | undefined;

  // --- Combat tab data ---

  /** Spirit combat skill item. */
  spiritCombatSkillData: RqgItem | undefined;
  /** Dodge skill item. */
  dodgeSkillData: RqgItem | undefined;

  /** Precalculated missile weapon SRs if loaded at start of round (HTML fragments). */
  loadedMissileSrDisplay: string[];
  /** Comma-separated loaded missile SR values for data-set-sr. */
  loadedMissileSr: string;
  /** Precalculated missile weapon SRs if not loaded (HTML fragments). */
  unloadedMissileSrDisplay: string[];
  /** Comma-separated unloaded missile SR values for data-set-sr. */
  unloadedMissileSr: string;

  /** Equipped projectile options for weapon ammo dropdown. */
  ownedProjectileOptions: SelectOptionData<string>[];

  /** Whether this actor is currently in combat. */
  isInCombat: boolean;
  /** DEX component SR buttons (1..dexSR). */
  dexSR: number[];
  /** SIZ component SR buttons (dexSR+1..dexSR+sizSR). */
  sizSR: number[];
  /** Remaining SR buttons (dexSR+sizSR+1..12). */
  otherSR: number[];
  /** Currently active SR values in combat tracker. */
  activeInSR: number[];

  /** Body type for hit location layout (e.g. "humanoid"). */
  bodyType: string;
  /** Error message if hit location dice ranges are invalid. */
  hitLocationDiceRangeError: string;

  /** Visibility flags for UI sections. */
  showUiSection: UiSections;

  // --- Background tab data ---

  /** List of homeland enum values for legacy fallback selectors. */
  homelands: string[];
  /** Localized occupation options for the select input. */
  occupationOptions: SelectOptionData<string>[];
  /** Feature flag controlling actor wizard-specific UI in background tab. */
  actorWizardFeatureFlag: boolean;
}
