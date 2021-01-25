import { JournalEntryLink } from "../shared/journalentrylink";

export enum SpiritMagicCastingRangeEnum {
  Self = "self",
  Touch = "touch",
  Ranged = "ranged", // 50 meters
}

export enum SpiritMagicDurationEnum {
  Instant = "instant",
  Temporal = "temporal", // 2 minutes (10 melee rounds)
  Focused = "focused", // Active for as long as the caster focuses
  Permanent = "permanent", // Ritual (Enchantment)
}

export enum SpiritMagicConcentrationEnum {
  Passive = "passive",
  Active = "active",
}

export type SpiritMagicData = JournalEntryLink & {
  points: number; // Learned strength
  isVariable: boolean; // Can the caster decide the number of magic points used
  castingRange: SpiritMagicCastingRangeEnum;
  duration: SpiritMagicDurationEnum;
  concentration: SpiritMagicConcentrationEnum;
  incompatibleWith: Array<string>; // Can't be cast if one of the listed spells are already active
  spellFocus: string;
  // --- Derived / Convenience Data Below ---
  strikeRank?: number; // DexSR + points.value - 1
  ranges?: Array<string>; // For select on sheet
  durations?: Array<string>; // For select on sheet
  types?: Array<string>; // For select on sheet
};

export const emptySpiritMagic: SpiritMagicData = {
  points: 0,
  isVariable: false,
  castingRange: SpiritMagicCastingRangeEnum.Ranged,
  duration: SpiritMagicDurationEnum.Instant,
  concentration: SpiritMagicConcentrationEnum.Passive,
  incompatibleWith: [],
  spellFocus: "",
  journalId: "",
  journalPack: "",
};
