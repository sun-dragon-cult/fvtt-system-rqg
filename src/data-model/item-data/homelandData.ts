import { JournalEntryLink } from "../shared/journalentrylink";
import { RqidLink } from "../shared/rqidLink";
import { IRqid } from "./IRqid";
import { ItemTypeEnum } from "./itemTypes";

export interface HomelandDataSourceData extends IRqid {
  homeland: string; // eg Sartar or Prax, fills in homeland field on Actor
  homelandJournalLink: JournalEntryLink; // Actor gets a link on the background tab
  region: string; // city or tribal region eg Jonstown, Colymar Tribe, fills in region field on Actor (aka town/home area)
  regionJournalLink: JournalEntryLink; // Actor gets a link on the background tab
  cultureJournalLinks: JournalEntryLink[]; // Actor gets a link on the background tab
  cultRqidLinks: RqidLink[]; // Chosen cult will be added to actor
  passionRqidLinks: RqidLink[]; // Actor gets choice to take passions at initial 60% or +10% if they already have it
  runeRqidLinks: RqidLink[]; // Actor gets choice to get +10% to each rune
  tribeJournalLinks: JournalEntryLink[]; // Actor gets a link on the backround tab (optional)
  clanJournalLinks: JournalEntryLink[]; // Actor gets a link on the background tab (optional)
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