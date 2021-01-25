import { emptyResource, Resource } from "../shared/resource";
import { JournalEntryLink } from "../shared/journalentrylink";

export enum CultRankEnum {
  LayMember = "layMember",
  Initiate = "initiate",
  GodTalker = "godTalker",
  RunePriest = "runePriest",
  RuneLord = "runeLord",
  ChiefPriest = "chiefPriest",
  HighPriest = "highPriest",
}

export type CultData = JournalEntryLink & {
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  runePoints: Resource;
  tagline: string;
  holyDays: string;
  runes: Array<string>;
  // cultSkills: Array<string>; // TODO Link to system wide id...
  // favouredPassions: Array<string>; // TODO Link to system wide id...
  // cultSpiritMagic: Array<string>; // TODO Link to system wide id...
  // prohibitedCultSpiritMagic: Array<string>; // TODO Link to system wide id...
  // cultRuneMagic: Array<string>; // TODO Link to system wide id...
  // cultEnchantments: Array<string>; // TODO Link to system wide id...
  subCults: string;
  // --- Derived / Convenience Data Below ---
  ranksEnum?: Array<CultRankEnum>; // For sheet dropdown
  allRunes?: Array<string>; // For sheet dropdown
};

export const emptyCult: CultData = {
  rank: CultRankEnum.LayMember,
  runePoints: emptyResource,
  tagline: "",
  holyDays: "",
  runes: [],
  subCults: "",
  journalId: "",
  journalPack: "",
};
