import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";

export interface HomelandDataSourceData {
  homeland: string;
  homelandJournalRqidLink: RqidLink | undefined;
  region: string;
  regionJournalRqidLink: RqidLink | undefined;
  cultureJournalRqidLinks: RqidLink[];
  tribeJournalRqidLinks: RqidLink[];
  clanJournalRqidLinks: RqidLink[];
  cultRqidLinks: RqidLink[];
  skillRqidLinks: RqidLink[];
  runeRqidLinks: RqidLink[];
  passionRqidLinks: RqidLink[];
  wizardInstructions: string;
}

// --- Derived Data ---
export interface HomelandDataPropertiesData extends HomelandDataSourceData {}

export interface HomelandDataSource {
  type: ItemTypeEnum.Homeland;
  system: HomelandDataSourceData;
}

export interface HomelandDataProperties {
  type: ItemTypeEnum.Homeland;
  system: HomelandDataSourceData;
}

export const defaultHomelandData: HomelandDataSourceData = {
  homeland: "",
  homelandJournalRqidLink: undefined,
  region: "",
  regionJournalRqidLink: undefined,
  cultureJournalRqidLinks: [],
  tribeJournalRqidLinks: [],
  clanJournalRqidLinks: [],
  cultRqidLinks: [],
  skillRqidLinks: [],
  runeRqidLinks: [],
  passionRqidLinks: [],
  wizardInstructions: "",
};
