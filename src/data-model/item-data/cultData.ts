import { Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";

export enum CultRankEnum {
  LayMember = "layMember",
  Initiate = "initiate",
  GodTalker = "godTalker",
  RunePriest = "runePriest",
  RuneLord = "runeLord",
  ChiefPriest = "chiefPriest",
  HighPriest = "highPriest",
}

export interface CultDataSourceData {
  descriptionRqidLink: RqidLink;
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  runePoints: Resource;
  tagline: string;
  holyDays: string;
  gifts: string;
  geases: string;
  runes: string[];
  // cultSkills: string[]; // TODO Link to system wide id...
  // cultStartingSkills: cultStartingSkill[] // TODO list of skills with base chance mod, see occupation
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
  system: CultDataSourceData;
}

export interface CultDataProperties {
  type: ItemTypeEnum.Cult;
  system: CultDataPropertiesData;
}

export const defaultCultData: CultDataSourceData = {
  descriptionRqidLink: new RqidLink(),
  rank: CultRankEnum.LayMember,
  runePoints: { value: 0, max: 0 },
  tagline: "",
  holyDays: "",
  gifts: "",
  geases: "",
  runes: [],
  subCults: "",
};
