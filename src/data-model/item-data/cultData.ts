import { Resource } from "../shared/resource";
import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";
import { IRqgItem } from "./IRqgItem";

export enum CultRankEnum {
  LayMember = "layMember",
  Initiate = "initiate",
  GodTalker = "godTalker",
  RunePriest = "runePriest",
  RuneLord = "runeLord",
  ChiefPriest = "chiefPriest",
  HighPriest = "highPriest",
}

export interface CultDataSourceData extends JournalEntryLink, IRqgItem {
  rqid: string;
  rqidpriority: number;
  rqidlang: string;
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  runePoints: Resource;
  tagline: string;
  holyDays: string;
  gifts: string;
  geases: string;
  runes: string[];
  // cultSkills: string[]; // TODO Link to system wide id...
  // favouredPassions: string[]; // TODO Link to system wide id...
  // cultSpiritMagic: string[]; // TODO Link to system wide id...
  // prohibitedCultSpiritMagic: string[]; // TODO Link to system wide id...
  // cultRuneMagic: string[]; // TODO Link to system wide id...
  // cultEnchantments: string[]; // TODO Link to system wide id...
  subCults: string;
}

// --- Derived Data ---
export interface CultDataPropertiesData extends CultDataSourceData {}

export interface CultDataSource {
  type: ItemTypeEnum.Cult;
  data: CultDataSourceData;
}

export interface CultDataProperties {
  type: ItemTypeEnum.Cult;
  data: CultDataPropertiesData;
}

export const emptyCult: CultDataSourceData = {
  rqid: "",
  rqidpriority: 0,
  rqidlang: "",
  rank: CultRankEnum.LayMember,
  runePoints: { value: 0, max: 0 },
  tagline: "",
  holyDays: "",
  gifts: "",
  geases: "",
  runes: [],
  subCults: "",
  journalId: "",
  journalPack: "",
};
