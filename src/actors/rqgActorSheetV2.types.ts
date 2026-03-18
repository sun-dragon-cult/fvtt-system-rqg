import type { SheetRuneData, MainCult } from "./rqgActorSheet.types";
import type { RqgItem } from "../items/rqgItem";
import type { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { CharacterDataPropertiesData } from "../data-model/actor-data/rqgActorData";

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
  /** Always true — templates use this to choose `<prose-mirror>` over `{{editor}}`. */
  isV2: boolean;
  system: CharacterDataPropertiesData;
  effects: unknown;

  /** Embedded items organized by type (from DataPrep.organizeEmbeddedItems). */
  embeddedItems: {
    [key in ItemTypeEnum]?: RqgItem[] | Record<string, RqgItem[]>;
  };

  /** Main cult for display in the header. */
  mainCult: MainCult;
  /** Sorted element runes with > 0% chance. */
  characterElementRunes: SheetRuneData[];
  /** Sorted power runes with > 50% chance. */
  characterPowerRunes: SheetRuneData[];
  /** Form runes that define the character. */
  characterFormRunes: SheetRuneData[];

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
}
