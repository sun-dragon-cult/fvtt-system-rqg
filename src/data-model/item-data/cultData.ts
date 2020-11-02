import { emptyResource, Resource } from "../shared/resource";

export enum CultRankEnum {
  LayMember = "layMember",
  Initiate = "initiate",
  GodTalker = "godTalker",
  RunePriest = "runePriest",
  RuneLord = "runeLord",
  ChiefPriest = "chiefPriest",
  HighPriest = "highPriest",
}

export type CultData = {
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  runePoints: Resource;
  holyDays: string;
  // cultSkills: Array<string>; // TODO Link to system wide id...
  // favouredPassions: Array<string>; // TODO Link to system wide id...
  // cultSpiritMagic: Array<string>; // TODO Link to system wide id...
  // prohibitedCultSpiritMagic: Array<string>; // TODO Link to system wide id...
  // cultRuneMagic: Array<string>; // TODO Link to system wide id...
  // cultEnchantments: Array<string>; // TODO Link to system wide id...
  subCults: Array<string>; // TODO How to model?
  description: string; // Runes,
  // --- Derived / Convenience Data Below ---
  ranksEnum?: Array<CultRankEnum>; // For sheet dropdown
};

export const emptyCult: CultData = {
  rank: CultRankEnum.LayMember,
  runePoints: emptyResource,
  holyDays: "",
  subCults: [],
  description: "",
};
