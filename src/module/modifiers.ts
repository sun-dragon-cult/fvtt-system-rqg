import {HitLocationsEnum} from "./data-model/actor-data/hit-location";

type LookupTableEntry<T> = {
  from: number;
  to: number;
  result: T;
}

export class Modifiers {
  public static dexSR(dex: number): number {
    return this.lookup<number>(dex, dexSrTable);
  }

  public static sizSR(siz: number): number {
    return this.lookup<number>(siz, sizSrTable);
  }

  public static hitPoints(constitution: number, size: number, power: number): number {
    return constitution + this.lookup<number>(size, hpSizTable) + this.lookup<number>(power, hpPowTable);
  }

  // TODO Humanoid centered as of yet
  // Returns a tuple with hit location name and hit point value
  public static hitPointsPerLocation(totalHitPoints: number): Array<[string, number]> {
    const mostLocations = this.lookup<number>(totalHitPoints, hpMostLocationsTable);
    const chest = this.lookup<number>(totalHitPoints, hpChestTable);
    const arms = this.lookup<number>(totalHitPoints, hpArmTable);
    return [
      [HitLocationsEnum.head, mostLocations],
      [HitLocationsEnum.leftArm, arms],
      [HitLocationsEnum.rightArm, arms],
      [HitLocationsEnum.chest, chest],
      [HitLocationsEnum.abdomen, mostLocations],
      [HitLocationsEnum.leftLeg, mostLocations],
      [HitLocationsEnum.rightLeg, mostLocations]
    ]
  }

  public static damageBonus(str: number, siz: number): string {
    return this.lookup<string>(str + siz, damageBonusTable);
  }


  public static spiritCombatDamage(pow: number, cha: number): string {
    return this.lookup<string>(pow + cha, spiritCombatDamageTable);
  }

  public static healingRate(con: number): number {
    return this.lookup<number>(con, healingRateTable);
  }

  private static lookup<T>(v: number, table: Array<LookupTableEntry<T>>): T {
    const tableEntry: LookupTableEntry<T> = table.find((te) => v >= te.from && v <= te.to);
    return tableEntry ? tableEntry.result : null;
  };
}

// DEX Strike Rank lookup
const dexSrTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 5, result: 5},
  {from: 6, to: 8, result: 4},
  {from: 9, to: 12, result: 3},
  {from: 13, to: 15, result: 2},
  {from: 16, to: 18, result: 1},
  {from: 19, to: Infinity, result: 0},
];

// SIZ Strike rank lookup
const sizSrTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 6, result: 3},
  {from: 7, to: 14, result: 2},
  {from: 15, to: 21, result: 1},
  {from: 22, to: Infinity, result: 0},
];

// Total hit points modifier. Lookup with size TODO redo as a method
const hpSizTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 4, result: -2},
  {from: 5, to: 8, result: -1},
  {from: 9, to: 12, result: 0},
  {from: 13, to: 16, result: 1},
  {from: 17, to: 20, result: 2},
  {from: 21, to: 24, result: 3},
  {from: 25, to: 28, result: 4},
  {from: 29, to: 32, result: 5},
  {from: 33, to: 36, result: 6},
  {from: 37, to: 40, result: 7},
  {from: 41, to: 44, result: 8},
  {from: 45, to: 48, result: 9},
  {from: 49, to: Infinity, result: 10}
];

// Total hit points modifier. Lookup with power TODO redo as a method
const hpPowTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 4, result: -1},
  {from: 5, to: 16, result: 0},
  {from: 17, to: 20, result: 1},
  {from: 21, to: 24, result: 2},
  {from: 25, to: 28, result: 3},
  {from: 29, to: 32, result: 4},
  {from: 33, to: 36, result: 5},
  {from: 37, to: 40, result: 6},
  {from: 41, to: 44, result: 7},
  {from: 45, to: 48, result: 8},
  {from: 49, to: Infinity, result: 9}
]

// Hitpoints for Each leg & Abdomen & Head. Lookup with total hit points TODO redo as a method
const hpMostLocationsTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 6, result: 2},
  {from: 7, to: 9, result: 3},
  {from: 10, to: 12, result: 4},
  {from: 13, to: 15, result: 5},
  {from: 16, to: 18, result: 6},
  {from: 19, to: 21, result: 7},
  {from: 22, to: 24, result: 8},
  {from: 25, to: 27, result: 9},
  {from: 28, to: 30, result: 10},
  {from: 31, to: Infinity, result: 11},
];

// Hitpoints for Chest. Lookup with total hit points TODO redo as a method
const hpChestTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 6, result: 3},
  {from: 7, to: 9, result: 4},
  {from: 10, to: 12, result: 5},
  {from: 13, to: 15, result: 6},
  {from: 16, to: 18, result: 7},
  {from: 19, to: 21, result: 8},
  {from: 22, to: 24, result: 9},
  {from: 25, to: 27, result: 10},
  {from: 28, to: 30, result: 11},
  {from: 31, to: Infinity, result: 12},
];

// Hitpoints for each arm. Lookup with total hit points TODO redo as a method
const hpArmTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 6, result: 1},
  {from: 7, to: 9, result: 2},
  {from: 10, to: 12, result: 3},
  {from: 13, to: 15, result: 4},
  {from: 16, to: 18, result: 5},
  {from: 19, to: 21, result: 6},
  {from: 22, to: 24, result: 7},
  {from: 25, to: 27, result: 8},
  {from: 28, to: 30, result: 9},
  {from: 31, to: Infinity, result: 10},
];

// Damage Bonus. Lookup with STR + SIZ TODO redo as a partial method?
const damageBonusTable: Array<LookupTableEntry<string>> = [
  {from: -Infinity, to: 12, result: "-1D4"},
  {from: 13, to: 24, result: "0"},
  {from: 25, to: 32, result: "1D4"},
  {from: 33, to: 40, result: "2D6"},
  {from: 41, to: 56, result: "2D6"},
  {from: 57, to: 73, result: "3D6"},
  {from: 74, to: 89, result: "4D6"},
  {from: 90, to: Infinity, result: "5D6"}
];

// Healing rate. Lookup with CON TODO redo as a method
const healingRateTable: Array<LookupTableEntry<number>> = [
  {from: -Infinity, to: 6, result: 1},
  {from: 7, to: 12, result: 2},
  {from: 13, to: 18, result: 3},
  {from: 19, to: 24, result: 4},
  {from: 25, to: 30, result: 5},
  {from: 31, to: 36, result: 6},
  {from: 37, to: 42, result: 7},
  {from: 43, to: Infinity, result: 8},
];

// Spirit Combat Damage. Lookup with POW + CHA
const spiritCombatDamageTable: Array<LookupTableEntry<string>> = [
  {from: -Infinity, to: 12, result: "1D3"},
  {from: 13, to: 24, result: "1D6"},
  {from: 25, to: 32, result: "1D6+1"},
  {from: 33, to: 40, result: "1D6+3"},
  {from: 41, to: 56, result: "2D6+3"},
  {from: 57, to: 72, result: "3D6+4"},
  {from: 73, to: Infinity, result: "4D6+5"},
];
