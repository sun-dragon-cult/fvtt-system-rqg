import { JournalEntryLink } from "../shared/journalentrylink";
import { IRqid } from "./IRqid";
import { ItemTypeEnum } from "./itemTypes";

export interface HomelandDataSourceData extends IRqid {
  homeland: string; // eg Sartar or Prax, fills in homeland field on Actor
  homelandJournalLink: JournalEntryLink; // Actor gets a link on the background tab
  region: string; // city or tribal region eg Jonstown, Colymar Tribe, fills in region field on Actor (aka town/home area)
  regionJournalLink: JournalEntryLink; // Actor gets a link on the background tab
  cultures: string[]; // names of the cultures, (choice fills in the Culture Field on the Actor???), get values from Journal Ids
  cultureJournalLinks: JournalEntryLink[]; // Actor gets a link on the background tab
  cultRqids: string[]; // Chosen cult will be added to actor
  localPassionRqids: string[]; // Actor gets choice to take passions at initial 60% or +10% if they already have it
  localRuneRqids: string[]; // Actor gets choice to get +10% to each rune
  tribeNames: string[]; // choice fills in the Tribe field on Actor, get values from Journal Ids
  tribeJournalLinks: JournalEntryLink[]; // Actor gets a link on the backround tab (optional)
  clanNames: string[]; // choice fills in the Clan field on Actor, get values from Journal Ids
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
    homelandJournalLink: new JournalEntryLink,
    region: "",
    regionJournalLink: new JournalEntryLink,
    cultures: [],
    cultureJournalLinks: [],
    cultRqids: [],
    localPassionRqids: [],
    localRuneRqids: [],
    tribeNames: [],
    tribeJournalLinks: [],
    clanNames: [],
    clanJournalLinks: [],
    rqid: "",
    rqidPriority: 0,
    rqidLang: ""
}