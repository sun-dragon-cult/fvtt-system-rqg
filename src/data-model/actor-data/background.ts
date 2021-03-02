export enum OccupationEnum {
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

export enum HomeLandEnum {
  Aggar = "aggar",
  Balazar = "balazar",
  Bilini = "bilini",
  Esrolia = "esrolia",
  Grazelands = "grazelands",
  Holay = "holay",
  Imither = "imither",
  LunarTarsh = "lunarTarsh",
  OldTarsh = "oldTarsh",
  PraxianTribes = "praxianTribes",
  Sartar = "sartar",
  Vansh = "vansh",
}

export class Background {
  constructor(
    public race: string,
    public occupation: OccupationEnum,
    public homeland: HomeLandEnum,
    public birthYear?: number,
    public age?: number,
    public gender?: string,
    public tribe?: string,
    public clan?: string,
    public reputation?: number,
    public standardOfLiving?: string,
    public ransom?: number,
    public baseIncome?: number,
    public biography?: string
  ) {}
}

export const emptyBackground = new Background("Human", OccupationEnum.Farmer, HomeLandEnum.Sartar);
