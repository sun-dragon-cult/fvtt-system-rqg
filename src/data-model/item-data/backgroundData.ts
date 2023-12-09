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

export class CharacteristicBonuses {
  strength: number = 0;
  constitution: number = 0;
  size: number = 0;
  dexterity: number = 0;
  intelligence: number = 0;
  power: number = 0;
  charisma: number = 0;
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
  instructions: string;
  miscellaneousBonuses: string;
  characteristicBonuses: CharacteristicBonuses;
  skillBonusRqidLinks: RqidLink[];
  anyCulturalWeaponSkillBonus: number;
  meleeCulturalWeaponSkillBonus: number;
  missileCulturalWeaponSkillBonus: number;
  culturalWeaponSkillRqidLinks: RqidLink[];
  incomeSkillRqidLinks: RqidLink[];
  cultSkillRqidLinks: RqidLink[];
  runeBonusRqidLinks: RqidLink[];
  runeMagicRqidLinks: RqidLink[];
  spiritMagicRqidLinks: RqidLink[];
  passionBonusRqidLinks: RqidLink[];
  suggestedCultRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "cult", that will be used as the "available and suggested cults"
  suggestedOccupationRqidLinks: RqidLink[]; // rqid links to other Backgrounds of type "occupation", that will be used as the "available and suggested occupations"
  suggestedHomelandRqidLinks: RqidLink[];
  suggestedTribeRqidLinks: RqidLink[];
  suggestedClanRqidLinks: RqidLink[];
  standardOfLiving: StandardOfLivingEnum | undefined;
  income: number;
  ransom: number;
  reputationBonus: number;
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
  instructions: "",
  miscellaneousBonuses: "",
  characteristicBonuses: new CharacteristicBonuses(),
  suggestedCultRqidLinks: [],
  suggestedOccupationRqidLinks: [],
  skillBonusRqidLinks: [],
  anyCulturalWeaponSkillBonus: 0,
  meleeCulturalWeaponSkillBonus: 0,
  missileCulturalWeaponSkillBonus: 0,
  culturalWeaponSkillRqidLinks: [],
  incomeSkillRqidLinks: [],
  cultSkillRqidLinks: [],
  runeBonusRqidLinks: [],
  runeMagicRqidLinks: [],
  spiritMagicRqidLinks: [],
  passionBonusRqidLinks: [],
  suggestedHomelandRqidLinks: [],
  suggestedTribeRqidLinks: [],
  suggestedClanRqidLinks: [],
  income: 0,
  ransom: 0,
  standardOfLiving: undefined,
  reputationBonus: 0,
};
