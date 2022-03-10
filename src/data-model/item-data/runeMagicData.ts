import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";
import { Spell, SpellConcentrationEnum, SpellDurationEnum, SpellRangeEnum } from "./spell";

export interface RuneMagicDataSourceData extends JournalEntryLink, Spell {
  /** The cult this rune magic is learned from and where to draw rune points */
  cultId: string;
  /** Array of rune names like "Man (form)" */
  runes: string[];
  /** Can the caster decide the number of rune points used */
  isStackable: boolean;
  /** Reduce max POW by the number of RP cast */
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
  rqid: "",
  rqidpriority: 0,
  rqidlang: "",
  cultId: "",
  runes: [],
  points: 0,
  castingRange: SpellRangeEnum.Ranged,
  duration: SpellDurationEnum.Temporal,
  concentration: SpellConcentrationEnum.Passive,
  isRitual: false,
  isStackable: false,
  isOneUse: false,
  isEnchantment: false,
  journalId: "",
  journalPack: "",
};
