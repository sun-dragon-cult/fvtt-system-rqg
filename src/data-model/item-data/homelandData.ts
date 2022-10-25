import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";

export interface HomelandDataSourceData {
  homeland: string;
  homelandJournalRqidLink: RqidLink;
  region: string;
  regionJournalRqidLink: RqidLink;
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
  homelandJournalRqidLink: new RqidLink(),
  region: "",
  regionJournalRqidLink: new RqidLink(),
  cultureJournalRqidLinks: [],
  tribeJournalRqidLinks: [],
  clanJournalRqidLinks: [],
  cultRqidLinks: [],
  skillRqidLinks: [],
  runeRqidLinks: [],
  passionRqidLinks: [],
  wizardInstructions: "",
};
