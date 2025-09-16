import { Resource } from "../shared/resource";
import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";
import type { RqgItem } from "@items/rqgItem.ts";

export type CultItem = RqgItem & { system: CultDataPropertiesData };

export enum CultRankEnum {
  LayMember = "layMember",
  Initiate = "initiate",
  GodTalker = "godTalker",
  RunePriest = "runePriest",
  RuneLord = "runeLord",
  ChiefPriest = "chiefPriest",
  HighPriest = "highPriest",
}

export interface JoinedCult {
  cultName: string | undefined; // For cults with subcults (like Orlanth & Yelm) others should have the Deity name
  tagline: string;
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  // cultSkills: string[]; // TODO #204 +++ Link to system wide id...
  // favouredPassions: string[]; // TODO Link to system wide id...
  // cultEnchantments: string[]; // TODO Link to system wide id...
  // cultStartingSkills: cultStartingSkill[] // TODO #204 +++ list of skills with base chance mod, see occupation
  // cultSpiritMagic: string[]; // TODO Link to system wide id...
}

export interface CultDataSourceData {
  deity: string | undefined;
  descriptionRqidLink: RqidLink | undefined;
  runePoints: Resource;
  holyDays: string;
  gifts: string;
  geases: string;
  runeRqidLinks: RqidLink[];
  commonRuneMagicRqidLinks: RqidLink[]; // List of runeMagic spells that should be embedded together with the cult
  // prohibitedCultSpiritMagic: string[]; // TODO Link to system wide id...
  // cultRuneMagic: string[]; // TODO #153 +++ Link to system wide id...
  joinedCults: JoinedCult[]; // Even cults without specific sub cults needs an entry here.
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

// export const defaultCultData: CultDataSourceData = {
//   deity: undefined,
//   joinedCults: [
//     {
//       cultName: "",
//       tagline: "",
//       rank: CultRankEnum.LayMember,
//     },
//   ],
//   commonRuneMagicRqidLinks: defaultCommonRuneMagic,
//   descriptionRqidLink: undefined,
//   runePoints: { value: 0, max: 0 },
//   holyDays: "",
//   gifts: "",
//   geases: "",
//   runeRqidLinks: [],
// };
