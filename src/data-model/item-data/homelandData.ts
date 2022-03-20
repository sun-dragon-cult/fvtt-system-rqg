import { JournalEntryLink } from "../shared/journalentrylink";
import { RqidLink } from "../shared/rqidLink";
import { IRqid } from "./IRqid";
import { ItemTypeEnum } from "./itemTypes";

export interface HomelandDataSourceData extends IRqid {
  homeland: string; 
  homelandJournalLink: JournalEntryLink;
  region: string;
  regionJournalLink: JournalEntryLink; 
  cultureJournalLinks: JournalEntryLink[];
  cultRqidLinks: RqidLink[]; 
  passionRqidLinks: RqidLink[]; 
  runeRqidLinks: RqidLink[]; 
  tribeJournalLinks: JournalEntryLink[];
  clanJournalLinks: JournalEntryLink[]; 
}

// --- Derived Data ---
export interface HomelandDataPropertiesData extends HomelandDataSourceData {}

export interface HomelandDataSource {
    type: ItemTypeEnum.Homeland;
    data: HomelandDataSourceData;
}

export interface HomelandDataProperties {
  type: ItemTypeEnum.Homeland;
  data: HomelandDataSourceData;
}

export const emptyHomeland: HomelandDataSourceData = {
  homeland: "",
  homelandJournalLink: new JournalEntryLink(),
  region: "",
  regionJournalLink: new JournalEntryLink(),
  cultureJournalLinks: [],
  cultRqidLinks: [],
  passionRqidLinks: [],
  runeRqidLinks: [],
  tribeJournalLinks: [],
  clanJournalLinks: [],
  rqid: "",
  rqidPriority: 0,
  rqidLang: "",
};