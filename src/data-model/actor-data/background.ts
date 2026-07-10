import { RqidLink } from "../shared/rqid-link";
import { OccupationEnum } from "./background-enums";

export interface Background {
  species: string;
  speciesRqidLink: RqidLink | undefined;
  occupation: OccupationEnum;
  currentOccupationRqidLink: RqidLink | undefined;
  homeland: string | undefined;
  town?: string;
  birthYear?: number;
  age?: number;
  gender?: string;
  tribe?: string;
  clan?: string;
  reputation?: number;
  standardOfLiving?: string;
  ransom?: number;
  ransomDetails?: string;
  baseIncome?: number;
  biography?: string;
  homelandJournalRqidLink: RqidLink | undefined;
  regionJournalRqidLink: RqidLink | undefined;
  cultureJournalRqidLinks: RqidLink[];
  tribeJournalRqidLinks: RqidLink[];
  clanJournalRqidLinks: RqidLink[];
}

// export const defaultBackground: Background = {
//   species: "Human",
//   speciesRqidLink: undefined,
//   occupation: OccupationEnum.NoOccupation,
//   currentOccupationRqidLink: undefined,
//   homeland: undefined,
//   homelandJournalRqidLink: undefined,
//   regionJournalRqidLink: undefined,
//   cultureJournalRqidLinks: [],
//   tribeJournalRqidLinks: [],
//   clanJournalRqidLinks: [],
// };
