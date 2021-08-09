import { emptyResource, Resource } from "../shared/resource";
import { JournalEntryLink } from "../shared/journalentrylink";
import { ItemTypeEnum } from "./itemTypes";

export enum CultRankEnum {
  LayMember = "layMember",
  Initiate = "initiate",
  GodTalker = "godTalker",
  RunePriest = "runePriest",
  RuneLord = "runeLord",
  ChiefPriest = "chiefPriest",
  HighPriest = "highPriest",
}

export interface CultData extends JournalEntryLink {
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  runePoints: Resource;
  tagline: string;
  holyDays: string;
  runes: string[];
  // cultSkills: string[]; // TODO Link to system wide id...
  // favouredPassions: string[]; // TODO Link to system wide id...
  // cultSpiritMagic: string[]; // TODO Link to system wide id...
  // prohibitedCultSpiritMagic: string[]; // TODO Link to system wide id...
  // cultRuneMagic: string[]; // TODO Link to system wide id...
  // cultEnchantments: string[]; // TODO Link to system wide id...
  subCults: string;
}

export interface CultItemData extends Item.Data<CultData> {
  type: ItemTypeEnum.Cult;
}

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
