import { JournalEntryLink } from "../shared/journalentrylink";
import { RqidLink } from "../shared/rqidLink";
import { IRqid } from "./IRqid";
import { ItemTypeEnum } from "./itemTypes";

// TODO: Does this belong in a file of its own?  If so where?
export enum StandardOfLivingEnum{
  Destitute = "destitute",
  Poor = "poor",
  Free = "free",
  Noble = "noble",
  PettyKing = "petty-king",
}

export interface OccupationDataSourceData extends IRqid {
  occupation: string,
  occupationJournalLink: JournalEntryLink;
  specialization: string,
  homelands: string[]; // The user can drop Homeland items on here but it will just save the data.homeland in this string array
  incomeSkillRqidLinks: RqidLink[];
  occupationalSkillRqidLinks: RqidLink[];
  standardOfLiving: StandardOfLivingEnum;
  baseIncome: number;
  baseIncomeNotes: string;
  cultRqidLinks: RqidLink[];
  ransom: number;
  startingEquipmentRqidLinks: RqidLink[];
}

// --- Derived Data ---
export interface OccupationDataPropertiesData extends OccupationDataSourceData {}

export interface OccupationDataSource {
  type: ItemTypeEnum.Occupation;
  data: OccupationDataSourceData;
}

export interface OccupationDataProperties {
  type: ItemTypeEnum.Occupation;
  data: OccupationDataSourceData;
}

export const emptyOccupation: OccupationDataSourceData = {
  occupation: "",
  occupationJournalLink: new JournalEntryLink(),
  specialization: "",
  homelands: [],
  incomeSkillRqidLinks: [],
  occupationalSkillRqidLinks: [],
  standardOfLiving: StandardOfLivingEnum.Destitute,
  baseIncome: 0,
  baseIncomeNotes: "",
  cultRqidLinks: [],
  ransom: 0,
  startingEquipmentRqidLinks: [],
  rqid: "",
  rqidPriority: 0,
  rqidLang: "",
};