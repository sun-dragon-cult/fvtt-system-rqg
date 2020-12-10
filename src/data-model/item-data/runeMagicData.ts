export enum RuneMagicCastingRangeEnum {
  Self = "self",
  Touch = "touch",
  Ranged = "ranged", // default 160 meters
}

export enum RuneMagicDurationEnum {
  Instant = "instant",
  Temporal = "temporal", // default 15 minutes
  Duration = "duration", // Length of pregnancy / 12 hours / variable etc
  Focused = "focused", // Active for as long as the caster focuses
  Permanent = "permanent", // Ritual (Enchantment)
}

export type RuneMagicData = {
  description: string;
  cultId: string; // The cult from where to draw rune points
  runes: Array<string>; // Rune names like "Man (form)"
  points: number; // Learned strength
  castingRange: RuneMagicCastingRangeEnum;
  duration: RuneMagicDurationEnum;
  isStackable: boolean; // Can the caster decide the number of rune points used
  isOneUse: boolean;
  chance: number; // Derived from runes, but has to be persisted?
  // --- Derived / Convenience Data Below ---
  isOwned?: boolean;
  ranges?: Array<string>; // For select on sheet
  durations?: Array<string>; // For select on sheet
  actorCults?: Array<any>; // For select on sheet
  allRunes?: Array<any>; // For select on sheet {_id: , name:, img: }
};

export const emptyRuneMagic: RuneMagicData = {
  description: "",
  cultId: "",
  runes: [],
  points: 0,
  castingRange: RuneMagicCastingRangeEnum.Ranged,
  duration: RuneMagicDurationEnum.Temporal,
  isStackable: false,
  isOneUse: false,
  chance: 0,
};
