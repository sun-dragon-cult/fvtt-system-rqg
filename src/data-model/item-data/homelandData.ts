import { RqidLink } from "../shared/rqidLink";
import { IRqid } from "./IRqid";
import { ItemTypeEnum } from "./itemTypes";

export interface HomelandDataSourceData extends IRqid {
  homeland: string;
  homelandJournalRqidLink: RqidLink;
  region: string;
  regionJournalRqidLink: RqidLink;
  cultureJournalRqidLinks: RqidLink[];
  cultRqidLinks: RqidLink[];
  passionRqidLinks: RqidLink[];
  runeRqidLinks: RqidLink[];
  tribeJournalRqidLinks: RqidLink[];
  clanJournalRqidLinks: RqidLink[];
  wizardInstructions: string;
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
  homelandJournalRqidLink: new RqidLink(),
  region: "",
  regionJournalRqidLink: new RqidLink(),
  cultureJournalRqidLinks: [],
  cultRqidLinks: [],
  passionRqidLinks: [],
  runeRqidLinks: [],
  tribeJournalRqidLinks: [],
  clanJournalRqidLinks: [],
  wizardInstructions: "",
  rqid: "",
  rqidPriority: 0,
  rqidLang: "",
};