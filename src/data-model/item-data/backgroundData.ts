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

// This will be for bonuses to Skills, Runes, and Passions
export interface BackgroundModifier {
  enabled: boolean;
  modifierType: string;
  // bonusToCharacteristic: string | undefined = undefined; // Should this be an enum? Is there one?  If there's a value it should reference the characteristic to which the bonus applies

  // scar: Scar | undefined; // When the owning Background is added to the Actor, prompt to accept and customize this scar
  // familyHistoryEntry: FamilyHistoryEntry | undefined;
}

export class SkillBackgroundModifier implements BackgroundModifier {
  enabled: boolean = false;
  modifierType: string = "skill";
  modifiedSkillRqidLink: RqidLink | undefined = undefined;
  bonus: number = 0;
  incomeSkill: boolean = false;
  cultStartingSkill: boolean = false;
  cultSkill: boolean = false;
  backgroundProvidesTraining: boolean = false;
}

export interface BackgroundDataSourceData {
  background: string;
  backgroundRqidLink: RqidLink | undefined;
  type: BackgroundTypeEnum;
  suggestedCultRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "cult", that will be used as the "available and suggested cults"
  suggestedOccupationRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "occupation", that will be used as the "available and suggested occupations"
  backgroundModifiers: BackgroundModifier[]; // might want to change this to skillModifiers?

  backgroundRuneRqidLinks: RqidLink[];

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
  backgroundModifiers: [],
  backgroundRuneRqidLinks: [],
  income: 0,
  ransom: 0,
  standardOfLiving: undefined,
};
