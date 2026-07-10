/**
 * Pure enum/const definitions for background-related data.
 * Extracted to allow import from build scripts without Foundry runtime dependencies.
 */

export const OccupationEnum = {
  NoOccupation: "",
  AssistantShaman: "assistantShaman",
  Bandit: "bandit",
  ChariotDriver: "chariotDriver",
  Crafter: "crafter",
  Entertainer: "entertainer",
  Farmer: "farmer",
  Fisher: "fisher",
  Healer: "healer",
  Herder: "herder",
  Hunter: "hunter",
  Merchant: "merchant",
  Noble: "noble",
  Philosopher: "philosopher",
  Priest: "priest",
  Scribe: "scribe",
  Thief: "thief",
  WarriorHeavyInfantry: "warriorHeavyInfantry",
  WarriorLightInfantry: "warriorLightInfantry",
  WarriorHeavyCavalry: "warriorHeavyCavalry",
  WarriorLightCavalry: "warriorLightCavalry",
} as const;
export type OccupationEnum = (typeof OccupationEnum)[keyof typeof OccupationEnum];

// This is just the default proposed homelands, it will eventually be replaced by the homeland item
export const HomeLandEnum = {
  Aggar: "aggar",
  Balazar: "balazar",
  BeastValley: "beastValley",
  Bilini: "bilini",
  BlackHorseCounty: "blackHorseCounty",
  DagoriInkarth: "dagoriInkarth",
  DragonPass: "dragonPass",
  DryadWoods: "dryadWoods",
  Esrolia: "esrolia",
  Grazelands: "grazelands",
  Hendrikiland: "hendrikiland",
  Heortland: "heortland",
  Holay: "holay",
  Imither: "imither",
  LunarTarsh: "lunarTarsh",
  OldTarsh: "oldTarsh",
  Prax: "prax",
  Sartar: "sartar",
  ShadowPlateau: "shadowPlateau",
  StinkingForest: "stinkingForest",
  TrollWoods: "trollWoods",
  Vansh: "vansh",
  HabitatChaosArea: "habitatChaosArea",
  HabitatForest: "habitatForest",
  HabitatGlacier: "habitatGlacier",
  HabitatMarshSwamp: "habitatMarshSwamp",
  HabitatMountainsHills: "habitatMountainsHills",
  HabitatPlains: "habitatPlains",
  HabitatSky: "habitatSky",
  HabitatSpiritPlane: "habitatSpiritPlane",
  HabitatUnderground: "habitatUnderground",
  HabitatWaterSea: "habitatWaterSea",
} as const;
export type HomeLandEnum = (typeof HomeLandEnum)[keyof typeof HomeLandEnum];
