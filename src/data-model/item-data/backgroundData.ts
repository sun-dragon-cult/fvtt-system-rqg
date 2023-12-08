import { ItemTypeEnum } from "./itemTypes";
import { RqidLink } from "../shared/rqidLink";

export enum BackgroundTypeEnum {
  Homeland = "homeland",
  Tribe = "tribe",
  Clan = "clan",
  Occupation = "occupation",
  Cult = "cult",
  FamilyHistoryEvent = "family history event", //Should this not have a space?
  None = "none", // not yet assigned?
}

export class Scar {
  hitLocationRqidLink: RqidLink | undefined = undefined;
  description: string = "";
  received: string = "";
  lingeringHpLoss: number = 0;
}

export class FamilyHistoryEntry {
  happenedToRelation: string = "";
  year: number | undefined = undefined;
  season: number | undefined = undefined;
  day: number | undefined = undefined;
  text: string = "";
}

export enum StandardOfLivingEnum {
  None = "none",
  Destitute = "destitute",
  Poor = "poor",
  Free = "free",
  Noble = "noble",
  PettyKing = "petty-king",
}

export interface BackgroundDataSourceData {
  background: string;
  backgroundRqidLink: RqidLink | undefined;
  type: BackgroundTypeEnum;
  backgroundSkillRqidLinks: RqidLink[];
  backgroundRuneRqidLinks: RqidLink[];
  backgroundPassionRqidLinks: RqidLink[];
  suggestedCultRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "cult", that will be used as the "available and suggested cults"
  suggestedOccupationRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "occupation", that will be used as the "available and suggested occupations"
  income: number;
  ransom: number;
  standardOfLiving: StandardOfLivingEnum | undefined;
}

// --- Derived Data ---
export interface BackgroundDataPropertiesData extends BackgroundDataSourceData {}

export interface BackgroundDataSource {
  type: ItemTypeEnum.Background;
  system: BackgroundDataSourceData;
}

export interface BackgroundDataProperties {
  type: ItemTypeEnum.Background;
  system: BackgroundDataSourceData;
}

export const defaultBackgroundData: BackgroundDataSourceData = {
  background: "",
  backgroundRqidLink: undefined,
  type: BackgroundTypeEnum.None,
  suggestedCultRqidLinks: [],
  suggestedOccupationRqidLinks: [],
  backgroundSkillRqidLinks: [],
  backgroundRuneRqidLinks: [],
  backgroundPassionRqidLinks: [],
  income: 0,
  ransom: 0,
  standardOfLiving: undefined,
};
