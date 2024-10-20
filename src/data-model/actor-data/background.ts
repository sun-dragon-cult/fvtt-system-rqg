import { RqidLink } from "../shared/rqidLink";

export enum OccupationEnum {
  NoOccupation = "",
  AssistantShaman = "assistantShaman",
  Bandit = "bandit",
  ChariotDriver = "chariotDriver",
  Crafter = "crafter",
  Entertainer = "entertainer",
  Farmer = "farmer",
  Fisher = "fisher",
  Healer = "healer",
  Herder = "herder",
  Hunter = "hunter",
  Merchant = "merchant",
  Noble = "noble",
  Philosopher = "philosopher",
  Priest = "priest",
  Scribe = "scribe",
  Thief = "thief",
  WarriorHeavyInfantry = "warriorHeavyInfantry",
  WarriorLightInfantry = "warriorLightInfantry",
  WarriorHeavyCavalry = "warriorHeavyCavalry",
  WarriorLightCavalry = "warriorLightCavalry",
}

// This is just the default proposed homelands, it will eventually be replaced by the homeland item
export enum HomeLandEnum {
  Aggar = "aggar",
  Balazar = "balazar",
  BeastValley = "beastValley",
  Bilini = "bilini",
  BlackHorseCounty = "blackHorseCounty",
  DagoriInkarth = "dagoriInkarth",
  DragonPass = "dragonPass",
  DryadWoods = "dryadWoods",
  Esrolia = "esrolia",
  Grazelands = "grazelands",
  Hendrikiland = "hendrikiland",
  Heortland = "heortland",
  Holay = "holay",
  Imither = "imither",
  LunarTarsh = "lunarTarsh",
  OldTarsh = "oldTarsh",
  Prax = "prax",
  Sartar = "sartar",
  ShadowPlateau = "shadowPlateau",
  StinkingForest = "stinkingForest",
  TrollWoods = "trollWoods",
  Vansh = "vansh",
  HabitatChaosArea = "habitatChaosArea",
  HabitatForest = "habitatForest",
  HabitatGlacier = "habitatGlacier",
  HabitatMarshSwamp = "habitatMarshSwamp",
  HabitatMountainsHills = "habitatMountainsHills",
  HabitatPlains = "habitatPlains",
  HabitatSky = "habitatSky",
  HabitatSpiritPlane = "habitatSpiritPlane",
  HabitatUnderground = "habitatUnderground",
  HabitatWaterSea = "habitatWaterSea",
}

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

export const defaultBackground: Background = {
  species: "Human",
  speciesRqidLink: undefined,
  occupation: OccupationEnum.NoOccupation,
  currentOccupationRqidLink: undefined,
  homeland: undefined,
  homelandJournalRqidLink: undefined,
  regionJournalRqidLink: undefined,
  cultureJournalRqidLinks: [],
  tribeJournalRqidLinks: [],
  clanJournalRqidLinks: [],
};
