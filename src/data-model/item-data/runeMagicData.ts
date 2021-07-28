import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";

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

export interface RuneMagicData extends JournalEntryLink {
  cultId: string; // The cult from where to draw rune points
  runes: string[]; // Rune names like "Man (form)"
  points: number; // Learned strength
  castingRange: RuneMagicCastingRangeEnum;
  duration: RuneMagicDurationEnum;
  isRitual: boolean;
  isStackable: boolean; // Can the caster decide the number of rune points used
  isOneUse: boolean;
  // --- Derived Data Below ---
  chance?: number; // Derived from Runes & Cults
}

export interface RuneMagicItemData extends Item.Data<RuneMagicData> {
  type: ItemTypeEnum.RuneMagic;
}

export const emptyRuneMagic: RuneMagicData = {
  cultId: "",
  runes: [],
  points: 0,
  castingRange: RuneMagicCastingRangeEnum.Ranged,
  duration: RuneMagicDurationEnum.Temporal,
  isRitual: false,
  isStackable: false,
  isOneUse: false,
  journalId: "",
  journalPack: "",
};
