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
  skillBonusRqidLinks: RqidLink[];
  incomeSkillRqidLinks: RqidLink[];
  cultSkillRqidLinks: RqidLink[];
  runeBonusRqidLinks: RqidLink[];
  passionBonusRqidLinks: RqidLink[];
  suggestedCultRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "cult", that will be used as the "available and suggested cults"
  suggestedOccupationRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "occupation", that will be used as the "available and suggested occupations"
  suggestedHomelandRqidLinks: RqidLink[];
  suggestedTribeRqidLinks: RqidLink[];
  suggestedClanRqidLinks: RqidLink[];
  standardOfLiving: StandardOfLivingEnum | undefined;
  income: number;
  ransom: number;
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
  skillBonusRqidLinks: [],
  incomeSkillRqidLinks: [],
  cultSkillRqidLinks: [],
  runeBonusRqidLinks: [],
  passionBonusRqidLinks: [],
  suggestedHomelandRqidLinks: [],
  suggestedTribeRqidLinks: [],
  suggestedClanRqidLinks: [],
  income: 0,
  ransom: 0,
  standardOfLiving: undefined,
};
