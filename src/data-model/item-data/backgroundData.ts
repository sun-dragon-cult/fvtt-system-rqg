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
  Destitute = "destitute",
  Poor = "poor",
  Free = "free",
  Noble = "noble",
  PettyKing = "petty-king",
}

// This will be for bonuses to Skills, Runes, and Passions
export class BackgroundModifier {
  enabled: boolean = false;

  bonus: number = 0;

  // In most cases this will be the RQID of the thing added and/or modified, like a Skill, Rune, Passion, Spell, or Equipment
  // This might be empty if the bonus is to a Characteristic or this is an
  rqid: RqidLink | undefined = undefined;

  bonusToCharacteristic: string | undefined = undefined; // Should this be an enum? Is there one?  If there's a value it should reference the characteristic to which the bonus applies

  name: string = ""; //This might be nice for displaying a list of the bonuses that apply to this actor, but isn't really needed just to do the business logic.  Value might be "From Cult of Ernalda" or "From Occupation Noble" and could be "filled in by default but overridable"

  incomeSkill: boolean = false; // Only display if type of RqidLink is skill
  cultStartingSkill: boolean = false; // Only display if type of RqidLink is skill
  cultSkill: boolean = false; // Only display if type of RqidLink is skill
  availableForTraining: boolean = false; // Only display if type of RqidLink is skill (OR can other things be affected by training?)

  income: number = 0;
  ransom: number = 0;
  standardOfLiving: StandardOfLivingEnum | undefined = undefined;

  scar: Scar | undefined; // When the owning Background is added to the Actor, prompt to accept and customize this scar
  familyHistoryEntry: FamilyHistoryEntry | undefined;
}

export interface BackgroundDataSourceData {
  background: string;
  backgroundRqidLink: RqidLink | undefined;
  type: BackgroundTypeEnum;
  suggestedCultRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "cult", that will be used as the "available and suggested cults"
  suggestedOccuptationRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "occupation", that will be used as the "available and suggested occupations"
  backgroundModifiers: BackgroundModifier[];
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
  suggestedOccuptationRqidLinks: [],
  backgroundModifiers: [],
};
