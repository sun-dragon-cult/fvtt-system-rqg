export enum SpiritMagicCastingRangeEnum {
  Self = "self",
  Touch = "touch",
  Ranged = "ranged", // 50 meters
}

export enum SpiritMagicDurationEnum {
  Instant = "instant",
  Temporal = "temporal", // 2 minutes (10 melee rounds)
  Permanent = "permanent", // Ritual (Enchantment)
}

export enum SpiritMagicTypeEnum {
  Passive = "passive",
  Active = "active", // Focussed??? Detect (*)
}

export type SpiritMagicData = {
  description: string;
  points: number; // Learned strength
  isVariable: boolean; // Can the caster decide the number of magic points used
  castingRange: SpiritMagicCastingRangeEnum;
  duration: SpiritMagicDurationEnum;
  spellType: SpiritMagicTypeEnum;
  incompatibleWith: Array<string>; // Can't be cast if one of the listed spells are already active
  // --- Derived / Convenience Data Below ---
  strikeRank?: number; // DexSR + points.value - 1
  ranges?: Array<string>; // For select on sheet
  durations?: Array<string>; // For select on sheet
  types?: Array<string>; // For select on sheet
};

export const emptySpiritMagic: SpiritMagicData = {
  description: "",
  points: 0,
  isVariable: false,
  castingRange: SpiritMagicCastingRangeEnum.Ranged,
  duration: SpiritMagicDurationEnum.Instant,
  spellType: SpiritMagicTypeEnum.Passive,
  incompatibleWith: [],
};
