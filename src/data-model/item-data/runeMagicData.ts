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

export interface RuneMagicDataSourceData extends JournalEntryLink {
  /** The cult this rune magic is learned from and where to draw rune points */
  cultId: string;
  /** Array of rune names like "Man (form)" */
  runes: string[];
  /** Learned strength */
  points: number;
  castingRange: RuneMagicCastingRangeEnum;
  duration: RuneMagicDurationEnum;
  isRitual: boolean;
  /** Can the caster decide the number of rune points used */
  isStackable: boolean;
  isOneUse: boolean;
}

// --- Derived Data ---
export interface RuneMagicDataPropertiesData extends RuneMagicDataSourceData {
  /** Derived: Calculated from rune & cult items on the same actor */
  chance: number;
}

export interface RuneMagicDataSource {
  type: ItemTypeEnum.RuneMagic;
  data: RuneMagicDataSourceData;
}

export interface RuneMagicDataProperties {
  type: ItemTypeEnum.RuneMagic;
  data: RuneMagicDataPropertiesData;
}

export const emptyRuneMagic: RuneMagicDataSourceData = {
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
