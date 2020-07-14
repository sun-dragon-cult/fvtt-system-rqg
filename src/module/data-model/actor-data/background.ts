export enum OccupationEnum {
  assistantShaman = "assistantShaman",
  bandit = "bandit",
  chariotDriver = "chariotDriver",
  crafter = "crafter",
  entertainer = "entertainer",
  farmer = "farmer",
  fisher = "fisher",
  healer = "healer",
  herder = "herder",
  hunter = "hunter",
  merchant = "merchant",
  noble = "noble",
  philosopher = "philosopher",
  priest = "priest",
  scribe = "scribe",
  thief = "thief",
  warriorHeavyInfantry = "warriorHeavyInfantry",
  warriorLightInfantry = "warriorLightInfantry",
  warriorHeavyCavalry = "warriorHeavyCavalry",
  warriorLightCavalry = "warriorLightCavalry",
}

export enum HomeLandEnum {
  sartar = "sartar",
  esrolia = "esrolia",
  grazelands = "grazelands",
  praxianTribes = "praxianTribes",
  lunarTarsh = "lunarTarsh",
  oldTarsh = "oldTarsh",
}

export class Background {
  constructor(
    public birthYear?: number,
    public age?: number,
    public gender?: string,
    public occupation?: OccupationEnum,
    public homeland?: HomeLandEnum,
    public tribe?: string,
    public clan?: string,
    public reputation?: number,
    public standardOfLiving?: string,
    public ransom?: number,
    public baseIncome?: number,
    public biography?: string
  ) {
  };
}


export const emptyBackground = new Background();
